const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initializeDatabase() {
  const dbPath = path.join(__dirname, '../../morphology.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Connected to database successfully');
    }
  });
}

function searchWord(word) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT w.*, p.part as part_of_speech_name
      FROM Word w
      LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
      WHERE w.sanitized_word = ?
    `;
    
    db.get(query, [word], (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row) {
          Promise.all([
            getPrefixInfo(row.info_prefix),
            getRootInfo(row.info_root),
            getSuffixInfo(row.info_suffix),
            getMorphologicalAlternation(row.id)
          ]).then(([prefixes, roots, suffixes, morphologicalAlternation]) => {
            resolve({
              ...row,
              prefixes,
              roots: removeDuplicateRootComponents(roots),
              suffixes,
              morphologicalAlternation
            });
          }).catch(reject);
        } else {
          resolve(null);
        }
      }
    });
  });
}

function getPrefixInfo(prefixIds) {
  if (!prefixIds || prefixIds === '0') return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    const ids = prefixIds.split(',');
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT * FROM Prefix 
      WHERE id IN (${placeholders})
    `;
    
    db.all(query, ids, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getRootInfo(rootInfo) {
  if (!rootInfo || rootInfo === '0') return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    // Split rootInfo by comma to handle multiple root IDs
    const rootIds = rootInfo.split(',');
    
    // Process each root ID and collect promises
    const promises = rootIds.map(rootId => {
      if (rootId.includes('_')) {
        // Handle main+secondary root format (e.g., "8_12")
        const [mainId, secondaryId] = rootId.split('_');
        const query = `
          SELECT m.*, s.identification_root as secondary_root, s.example as secondary_example
          FROM MainRoot m
          LEFT JOIN SecondaryRoot s ON s.mainRootId = m.id
          WHERE m.id = ? AND s.id = ?
        `;
        return new Promise((resolveRoot, rejectRoot) => {
          db.get(query, [mainId, secondaryId], (err, row) => {
            if (err) rejectRoot(err);
            else resolveRoot(row ? [row] : []);
          });
        });
      } else {
        // Handle simple root format
        const query = 'SELECT * FROM MainRoot WHERE id = ?';
        return new Promise((resolveRoot, rejectRoot) => {
          db.get(query, [rootId], (err, row) => {
            if (err) rejectRoot(err);
            else resolveRoot(row ? [row] : []);
          });
        });
      }
    });
    
    // Wait for all root data to be fetched and flatten the results array
    Promise.all(promises)
      .then(results => {
        // Flatten the array of arrays into a single array
        const flattenedResults = [].concat(...results);
        resolve(flattenedResults);
      })
      .catch(reject);
  });
}

function getSuffixInfo(suffixIds) {
  if (!suffixIds || suffixIds === '0') return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    const ids = suffixIds.split(',');
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT * FROM Suffix 
      WHERE id IN (${placeholders})
    `;
    
    db.all(query, ids, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function searchSimilarWords(word) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT basic_word, sanitized_word FROM Word 
      WHERE sanitized_word LIKE ? 
      LIMIT 5
    `;
    
    db.all(query, [`%${word}%`], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getWordsByLetter(letter, page = 0, limit = 100) {
  return new Promise((resolve, reject) => {
    const offset = page * limit;
    const query = `
      SELECT w.*, p.part as part_of_speech_name 
      FROM Word w
      LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
      WHERE w.sanitized_word LIKE ?
      ORDER BY w.sanitized_word
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [`${letter}%`, limit, offset], async (err, rows) => {
      if (err) {
        reject(err);
      } else {
        try {
          const wordsWithDetails = await Promise.all(
            rows.map(async (row) => {
              const [prefixes, roots, suffixes, morphologicalAlternation] = await Promise.all([
                getPrefixInfo(row.info_prefix),
                getRootInfo(row.info_root),
                getSuffixInfo(row.info_suffix),
                getMorphologicalAlternation(row.id)
              ]);
              return {
                ...row,
                prefixes: removeDuplicateComponents(prefixes),
                roots: removeDuplicateRootComponents(roots),
                suffixes: removeDuplicateComponents(suffixes),
                morphologicalAlternation
              };
            })
          );
          
          // Get total count for pagination
          db.get(
            `SELECT COUNT(*) as total FROM Word WHERE sanitized_word LIKE ?`, 
            [`${letter}%`], 
            (countErr, countRow) => {
              if (countErr) {
                reject(countErr);
              } else {
                resolve({
                  words: wordsWithDetails,
                  total: countRow ? countRow.total : 0,
                  page,
                  limit
                });
              }
            }
          );
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

function removeDuplicateComponents(components) {
  const seen = new Set();
  const uniqueComponents = [];
  const explanationMap = new Map();

  components.forEach(component => {
    const identifier = component.identification_prefix || 
                      component.identification_root || 
                      component.identification_suffix;
    
    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueComponents.push(component);
    }
    
    if (component.explanation) {
      if (!explanationMap.has(identifier)) {
        explanationMap.set(identifier, []);
      }
      explanationMap.get(identifier).push(component.explanation);
    }
  });

  return uniqueComponents.map(component => {
    const identifier = component.identification_prefix || 
                      component.identification_root || 
                      component.identification_suffix;
    return {
      ...component,
      allExplanations: explanationMap.get(identifier) || []
    };
  });
}

// Специальная функция для удаления дубликатов корней на основе их имени
function removeDuplicateRootComponents(components) {
  const seen = new Set();
  const uniqueComponents = [];

  components.forEach(component => {
    // Для корней используем identification_root или secondary_root
    const identifier = component.identification_root || component.secondary_root || "";
    
    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueComponents.push(component);
    }
  });

  // Для корней не добавляем объяснения
  return uniqueComponents;
}

function searchByComponent(type, id) {
  return new Promise((resolve, reject) => {
    let query;
    let params;
    const exactId = id.toString();

    switch (type) {
      case 'prefix':
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_prefix = ? 
          OR w.info_prefix LIKE ? 
          OR w.info_prefix LIKE ? 
          OR w.info_prefix LIKE ?
          ORDER BY w.sanitized_word
        `;
        params = [
          exactId,
          `${exactId},%`,
          `%,${exactId},%`,
          `%,${exactId}`
        ];
        break;
      case 'root':
        // For root search, use LIKE to narrow down the potential matches
        // before more precise JavaScript filtering
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_root = ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ?
          OR w.info_root LIKE ?
          ORDER BY w.sanitized_word
        `;
        params = [
          exactId,                   // Exact match
          `${exactId},%`,            // At beginning with comma
          `%,${exactId},%`,          // In middle with commas
          `%,${exactId}`,            // At end with comma
          `${exactId}_%`,            // As main root ID
          `%_${exactId}%`            // As secondary root ID
        ];
        break;
      case 'suffix':
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_suffix = ? 
          OR w.info_suffix LIKE ? 
          OR w.info_suffix LIKE ? 
          OR w.info_suffix LIKE ?
          ORDER BY w.sanitized_word
        `;
        params = [
          exactId,
          `${exactId},%`,
          `%,${exactId},%`,
          `%,${exactId}`
        ];
        break;
      default:
        return reject(new Error('Invalid component type'));
    }
    
    db.all(query, params, async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        let filteredRows = rows;
        
        // For root searches, we need to filter the results more precisely
        if (type === 'root') {
          filteredRows = rows.filter(row => {
            if (!row.info_root) return false;
            
            // Check each part of the info_root string for exact matches
            const parts = row.info_root.split(',');
            
            for (const part of parts) {
              // Direct match
              if (part === exactId) return true;
              
              // Check for main/secondary root pattern (e.g., "8_12")
              if (part.includes('_')) {
                const [mainId, secondaryId] = part.split('_');
                if (mainId === exactId || secondaryId === exactId) {
                  return true;
                }
              }
            }
            
            return false;
          });
        }
        
        const wordsWithDetails = await Promise.all(
          filteredRows.map(async (row) => {
            const [prefixes, roots, suffixes, morphologicalAlternation] = await Promise.all([
              getPrefixInfo(row.info_prefix),
              getRootInfo(row.info_root),
              getSuffixInfo(row.info_suffix),
              getMorphologicalAlternation(row.id)
            ]);
            return {
              ...row,
              prefixes: removeDuplicateComponents(prefixes),
              roots: removeDuplicateRootComponents(roots),
              suffixes: removeDuplicateComponents(suffixes),
              morphologicalAlternation
            };
          })
        );
        
        resolve({ words: wordsWithDetails });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getAllComponents(type) {
  return new Promise((resolve, reject) => {
    let query;
    switch (type) {
      case 'prefix':
        query = 'SELECT * FROM Prefix';
        break;
      case 'root':
        query = 'SELECT * FROM MainRoot';
        break;
      case 'suffix':
        query = 'SELECT * FROM Suffix';
        break;
      default:
        return reject(new Error('Invalid component type'));
    }
    
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(removeDuplicateComponents(rows || []));
    });
  });
}

function sanitizeWord(word) {
  return word.toLowerCase().trim();
}

function getMorphologicalAlternation(wordId) {
  return new Promise((resolve, reject) => {
    if (!wordId) {
      resolve(null);
      return;
    }
    
    const query = `
      SELECT * FROM Morphological_alternation 
      WHERE word_id = ?
    `;
    
    db.all(query, [wordId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
  initializeDatabase,
  searchWord,
  searchSimilarWords,
  searchByComponent,
  getAllComponents,
  getWordsByLetter,
  sanitizeWord
}; 