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
            getSuffixInfo(row.info_suffix)
          ]).then(([prefixes, roots, suffixes]) => {
            resolve({
              ...row,
              prefixes,
              roots,
              suffixes
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
    if (rootInfo.includes('_')) {
      const [mainId, secondaryId] = rootInfo.split('_');
      const query = `
        SELECT m.*, s.identification_root as secondary_root, s.example as secondary_example
        FROM MainRoot m
        LEFT JOIN SecondaryRoot s ON s.mainRootId = m.id
        WHERE m.id = ? AND s.id = ?
      `;
      db.get(query, [mainId, secondaryId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? [row] : []);
      });
    } else {
      const query = 'SELECT * FROM MainRoot WHERE id = ?';
      db.get(query, [rootInfo], (err, row) => {
        if (err) reject(err);
        else resolve(row ? [row] : []);
      });
    }
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

function searchByComponent(type, id) {
  return new Promise((resolve, reject) => {
    let query;
    switch (type) {
      case 'prefix':
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_prefix = ? OR w.info_prefix LIKE ? OR w.info_prefix LIKE ? OR w.info_prefix LIKE ?
          ORDER BY w.sanitized_word
        `;
        break;
      case 'root':
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_root = ? OR w.info_root LIKE ? OR w.info_root LIKE ? OR w.info_root LIKE ?
          ORDER BY w.sanitized_word
        `;
        break;
      case 'suffix':
        query = `
          SELECT w.*, p.part as part_of_speech_name 
          FROM Word w
          LEFT JOIN Part_of_speech p ON w.part_of_speech = p.id
          WHERE w.info_suffix = ? OR w.info_suffix LIKE ? OR w.info_suffix LIKE ? OR w.info_suffix LIKE ?
          ORDER BY w.sanitized_word
        `;
        break;
      default:
        return reject(new Error('Invalid component type'));
    }
    
    const params = [
      id.toString(),
      `${id},%`,
      `%,${id},%`,
      `%,${id}`
    ];
    
    db.all(query, params, async (err, rows) => {
      if (err) {
        reject(err);
      } else {
        try {
          const wordsWithDetails = await Promise.all(
            rows.map(async (row) => {
              const [prefixes, roots, suffixes] = await Promise.all([
                getPrefixInfo(row.info_prefix),
                getRootInfo(row.info_root),
                getSuffixInfo(row.info_suffix)
              ]);
              return {
                ...row,
                prefixes: removeDuplicateComponents(prefixes),
                roots: removeDuplicateComponents(roots),
                suffixes: removeDuplicateComponents(suffixes)
              };
            })
          );
          resolve({ words: wordsWithDetails });
        } catch (error) {
          reject(error);
        }
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

module.exports = {
  initializeDatabase,
  searchWord,
  searchSimilarWords,
  searchByComponent,
  getAllComponents,
  sanitizeWord
}; 