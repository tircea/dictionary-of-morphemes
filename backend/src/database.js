const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initializeDatabase() {
  const dbPath = path.join(__dirname, '../../morphology.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error connecting to database:', err);
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
      else {
        const processedPrefixes = Promise.all(rows.map(async prefix => {
          const explanation = prefix.explanation || '';
          
          if (explanation.includes('див.') || explanation.startsWith('див ')) {
            return processReferencedPrefixes(prefix);
          }
          
          return prefix;
        }));
        
        processedPrefixes.then(resolve).catch(reject);
      }
    });
  });
}

function getRootInfo(rootInfo) {
  if (!rootInfo || rootInfo === '0') return Promise.resolve([]);
  
  return new Promise((resolve, reject) => {
    const rootIds = rootInfo.split(',');
    
    const promises = rootIds.map(rootId => {
      if (rootId.includes('_')) {
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
        const query = 'SELECT * FROM MainRoot WHERE id = ?';
        return new Promise((resolveRoot, rejectRoot) => {
          db.get(query, [rootId], (err, row) => {
            if (err) rejectRoot(err);
            else resolveRoot(row ? [row] : []);
          });
        });
      }
    });
    
    Promise.all(promises)
      .then(results => {
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
      else {
        const processedSuffixes = Promise.all(rows.map(async suffix => {
          const explanation = suffix.explanation || '';
          
          if (explanation.includes('див.') || explanation.startsWith('див ')) {
            return processReferencedSuffixes(suffix);
          }
          
          return suffix;
        }));
        
        processedSuffixes.then(resolve).catch(reject);
      }
    });
  });
}

async function processReferencedSuffixes(suffix) {
  const processedSuffix = { ...suffix, referencedSuffixes: [] };
  const explanation = suffix.explanation || '';
  let standardPattern = /див\.?\s+(?:\()?\/?([^\/]+)\/?\/?(?:\))?(?:\s+([IVX]+))?/g;
  let match;
  while ((match = standardPattern.exec(explanation)) !== null) {
    const referencedSuffixId = "/" + match[1].trim().replaceAll(";", "") + "/";
    
    const romanNumeral = match[2] ? match[2].trim() : null;
    const semanticInfo = romanNumeral ? romanToArabic(romanNumeral) : 0;

    console.log(referencedSuffixId);
    console.log(romanNumeral, semanticInfo);

    try {
      const referencedSuffix = await getReferencedSuffix(referencedSuffixId, semanticInfo);
      if (referencedSuffix) processedSuffix.referencedSuffixes.push(referencedSuffix);
    } catch (error) {
      console.error(`Error fetching referenced suffix ${referencedSuffixId} with semantic_info ${semanticInfo}:`, error);
    }
  }
  

  const andPattern = /\/([^\/]+)\/\s+([IVX]+)\s+і\s+(?:\/([^\/]+)\/\s+)?([IVX]+)/g;
  
  while ((match = andPattern.exec(explanation)) !== null) {
    const firstSuffixId = match[1].trim();
    const firstRoman = match[2].trim();
    const secondSuffixId = match[3] ? match[3].trim() : firstSuffixId; 
    const secondRoman = match[4].trim();

    try {
      const semanticInfo = romanToArabic(firstRoman);
      const referencedSuffix = await getReferencedSuffix(firstSuffixId, semanticInfo);
      if (referencedSuffix && !referencedSuffixExists(processedSuffix.referencedSuffixes, referencedSuffix)) {
        processedSuffix.referencedSuffixes.push(referencedSuffix);
      }
    } catch (error) {
      console.error(`Error fetching referenced suffix ${firstSuffixId} with semantic_info ${romanToArabic(firstRoman)}:`, error);
    }
    
    try {
      const semanticInfo = romanToArabic(secondRoman);
      const referencedSuffix = await getReferencedSuffix(secondSuffixId, semanticInfo);
      if (referencedSuffix && !referencedSuffixExists(processedSuffix.referencedSuffixes, referencedSuffix)) {
        processedSuffix.referencedSuffixes.push(referencedSuffix);
      }
    } catch (error) {
      console.error(`Error fetching referenced suffix ${secondSuffixId} with semantic_info ${romanToArabic(secondRoman)}:`, error);
    }
  }
  
  return processedSuffix;
}


function referencedSuffixExists(suffixes, newSuffix) {
  return suffixes.some(suffix => 
    suffix.identification_suffix === newSuffix.identification_suffix && 
    suffix.semantic_info === newSuffix.semantic_info
  );
}

function getReferencedSuffix(suffixIdentifier, semanticInfo = 0) {
  return new Promise((resolve, reject) => {
    let query;
    let params;
    
    // First try with the original suffixIdentifier
    const trySearch = (suffixId) => {
      if (semanticInfo > 0) {
        query = `
          SELECT * FROM Suffix 
          WHERE identification_suffix = ? AND semantic_info = ?
        `;
        params = [suffixId, semanticInfo];
      } else {
        query = `
          SELECT * FROM Suffix 
          WHERE identification_suffix = ?
        `;
        params = [suffixId];
      }
      
      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({...row, semantic_info: semanticInfo});
        } else if (suffixId.endsWith('/')) {
          // If not found and has trailing slash, try without it
          trySearch(suffixId.slice(0, -1));
        } else if (semanticInfo > 0) {
          // If not found and has semantic info, try without semantic info
          getReferencedSuffix(suffixIdentifier, 0)
            .then(resolve)
            .catch(reject);
        } else {
          resolve(null);
        }
      });
    };

    trySearch(suffixIdentifier);
  });
}

function romanToArabic(roman) {
  if (!roman) return 0;
  
  const romanValues = {
    'I': 1,
    'V': 5,
    'X': 10,
    'L': 50,
    'C': 100,
    'D': 500,
    'M': 1000
  };
  
  let result = 0;
  
  for (let i = 0; i < roman.length; i++) {
    const current = romanValues[roman[i]];
    const next = romanValues[roman[i + 1]];
    
    if (next && current < next) {
      result += next - current;
      i++;
    } else {
      result += current;
    }
  }
  
  return result;
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

function removeDuplicateRootComponents(components) {
  const seen = new Set();
  const uniqueComponents = [];

  components.forEach(component => {
    const identifier = component.identification_root || component.secondary_root || "";
    
    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueComponents.push(component);
    }
  });

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
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_root = ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ? 
          OR w.info_root LIKE ?
          ORDER BY w.sanitized_word
        `;
        params = [
          exactId,
          `${exactId},%`,
          `%,${exactId},%`,
          `%,${exactId}`,
          `${exactId}_%`
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
        
        if (type === 'root') {
          filteredRows = rows.filter(row => {
            if (!row.info_root) return false;
            const parts = row.info_root.split(',');
            
            for (const part of parts) {
              if (part === exactId) return true;
              if (part.includes('_')) {
                const [mainId, secondaryId] = part.split('_');
                if (mainId === exactId) {
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

async function processReferencedPrefixes(prefix) {
  const processedPrefix = { ...prefix, referencedPrefixes: [] };
  const explanation = prefix.explanation || '';
  let standardPattern = /див\.?\s+(?:\()?([^\/]+)\/(?:\))?(?:\s+([IVX]+))?/g;
  let match;
  while ((match = standardPattern.exec(explanation)) !== null) {
    const referencedPrefixId = match[1].trim().replaceAll(";", "") + "/";
    
    const romanNumeral = match[2] ? match[2].trim() : null;
    const semanticInfo = romanNumeral ? romanToArabic(romanNumeral) : 0;

    try {
      const referencedPrefix = await getReferencedPrefix(referencedPrefixId, semanticInfo);
      if (referencedPrefix) processedPrefix.referencedPrefixes.push(referencedPrefix);
    } catch (error) {
      console.error(`Error fetching referenced prefix ${referencedPrefixId} with semantic_info ${semanticInfo}:`, error);
    }
  }

  const andPattern = /([^\/]+)\/\s+([IVX]+)\s+і\s+(?:([^\/]+)\/\s+)?([IVX]+)/g;
  
  while ((match = andPattern.exec(explanation)) !== null) {
    const firstPrefixId = match[1].trim() + "/";
    const firstRoman = match[2].trim();
    const secondPrefixId = match[3] ? match[3].trim() + "/" : firstPrefixId; 
    const secondRoman = match[4].trim();

    try {
      const semanticInfo = romanToArabic(firstRoman);
      const referencedPrefix = await getReferencedPrefix(firstPrefixId, semanticInfo);
      if (referencedPrefix && !referencedPrefixExists(processedPrefix.referencedPrefixes, referencedPrefix)) {
        processedPrefix.referencedPrefixes.push(referencedPrefix);
      }
    } catch (error) {
      console.error(`Error fetching referenced prefix ${firstPrefixId} with semantic_info ${romanToArabic(firstRoman)}:`, error);
    }
    
    try {
      const semanticInfo = romanToArabic(secondRoman);
      const referencedPrefix = await getReferencedPrefix(secondPrefixId, semanticInfo);
      if (referencedPrefix && !referencedPrefixExists(processedPrefix.referencedPrefixes, referencedPrefix)) {
        processedPrefix.referencedPrefixes.push(referencedPrefix);
      }
    } catch (error) {
      console.error(`Error fetching referenced prefix ${secondPrefixId} with semantic_info ${romanToArabic(secondRoman)}:`, error);
    }
  }
  
  return processedPrefix;
}

function referencedPrefixExists(prefixes, newPrefix) {
  return prefixes.some(prefix => 
    prefix.identification_prefix === newPrefix.identification_prefix && 
    prefix.semantic_info === newPrefix.semantic_info
  );
}

function getReferencedPrefix(prefixIdentifier, semanticInfo = 0) {
  return new Promise((resolve, reject) => {
    let query;
    let params;
    
    if (semanticInfo > 0) {
      query = `
        SELECT * FROM Prefix 
        WHERE identification_prefix = ? AND semantic_info = ?
      `;
      params = [prefixIdentifier, semanticInfo];
    } else {
      query = `
        SELECT * FROM Prefix 
        WHERE identification_prefix = ?
      `;
      params = [prefixIdentifier];
    }
    
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else if (row) {
        resolve({...row, semantic_info: semanticInfo});
      } else if (semanticInfo > 0) {
        // If not found and has semantic info, try without semantic info
        getReferencedPrefix(prefixIdentifier, 0)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(null);
      }
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