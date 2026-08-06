/**
 * PROJECT REF REPLACEMENT SCRIPT (Task A2)
 * Replaces all occurrences of old Supabase project ref with the new project ref
 * in src/data/products.json and image_migration_log.json.
 *
 * Usage:
 *   node scripts/update-project-ref.js [NEW_PROJECT_REF]
 *   Example:
 *     node scripts/update-project-ref.js pjtpnwxajocgdseqjfvn
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const OLD_REF = process.env.OLD_PROJECT_REF || 'hvcpjupsxuwfxnyfuyzw';
const NEW_REF = process.argv[2] || process.env.NEW_PROJECT_REF || 'pjtpnwxajocgdseqjfvn';

console.log(`🔄 Replacing project ref: ${OLD_REF} ➔ ${NEW_REF}`);

const targetFiles = [
    'src/data/products.json',
    'image_migration_log.json'
];

let totalReplacements = 0;

for (const filePath of targetFiles) {
    if (!existsSync(filePath)) {
        console.warn(`⚠️ Warning: ${filePath} not found. Skipping.`);
        continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const matches = (content.match(new RegExp(OLD_REF, 'g')) || []).length;

    if (matches > 0) {
        const updatedContent = content.replaceAll(OLD_REF, NEW_REF);
        writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`  ✅ ${filePath}: Replaced ${matches} occurrences of "${OLD_REF}" with "${NEW_REF}".`);
        totalReplacements += matches;
    } else {
        console.log(`  ℹ️ ${filePath}: No occurrences of "${OLD_REF}" found.`);
    }
}

console.log(`\n🎉 Project ref update completed. Total replacements: ${totalReplacements}`);
