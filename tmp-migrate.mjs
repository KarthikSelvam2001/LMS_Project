import fs from 'fs';

const yamlPath = './pnpm-workspace.yaml';
if (!fs.existsSync(yamlPath)) {
    console.log("No pnpm-workspace.yaml found!");
    process.exit(0);
}
const yamlContent = fs.readFileSync(yamlPath, 'utf-8');

const catalog = {};
let inCatalog = false;
for (const line of yamlContent.split('\n')) {
    if (line.trim() === 'catalog:') {
        inCatalog = true;
        continue;
    }
    if (inCatalog && line.startsWith('  ')) {
        const match = line.match(/^\s+(?:'([^']+)'|([^:]+)):\s+(.+)$/);
        if (match) {
            const key = match[1] || match[2];
            catalog[key] = match[3].trim();
        }
    } else if (inCatalog && line.trim() && !line.startsWith('  ')) {
        inCatalog = false;
    }
}

const packageJsons = [
    'artifacts/api-server/package.json',
    'artifacts/lms-frontend/package.json',
    'artifacts/mockup-sandbox/package.json',
    'lib/api-client-react/package.json',
    'lib/api-spec/package.json',
    'lib/api-zod/package.json',
    'lib/db/package.json',
    'scripts/package.json',
];

for (const pkgPath of packageJsons) {
    if (!fs.existsSync(pkgPath)) continue;
    let content = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    let changed = false;

    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[depType]) {
            for (const [dep, ver] of Object.entries(pkg[depType])) {
                if (ver === 'catalog:') {
                    pkg[depType][dep] = catalog[dep];
                    changed = true;
                } else if (ver.startsWith('workspace:')) {
                    pkg[depType][dep] = '*';
                    changed = true;
                }
            }
        }
    }

    // Rewrite scripts that use pnpm
    if (pkg.scripts) {
        for (const [name, script] of Object.entries(pkg.scripts)) {
            if (script.includes('pnpm')) {
                pkg.scripts[name] = script.replace(/pnpm/g, 'npm');
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Updated ${pkgPath}`);
    }
}

// update root package.json
const rootPkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
rootPkg.workspaces = [
    "artifacts/*",
    "lib/*",
    "lib/integrations/*",
    "scripts"
];
if (rootPkg.scripts) {
    if (rootPkg.scripts.build) rootPkg.scripts.build = "npm run typecheck && npm run build --workspaces --if-present";
    if (rootPkg.scripts.typecheck) rootPkg.scripts.typecheck = "npm run typecheck:libs && npm run typecheck --workspaces --if-present";
}
fs.writeFileSync('./package.json', JSON.stringify(rootPkg, null, 2) + '\n');
console.log('Updated root package.json');
