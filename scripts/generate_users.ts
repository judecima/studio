import * as fs from 'fs';
import * as path from 'path';

const USERS = ['ch_arquimax', 'sp_arquimax', 'lb_arquimax', 'rs_arquimax'];
const ADMINS = ['edu_arquimax', 'lucas_arquimax', 'ju_admin'];

function generatePassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

const authData: any[] = [];
const report: string[] = ["# Credenciales Generadas", "", "| Usuario | Contraseña | Rol |", "| --- | --- | --- |"];

USERS.forEach(username => {
    const password = generatePassword();
    authData.push({ username, password, role: 'usuario' });
    report.push(`| ${username} | \`${password}\` | usuario |`);
});

ADMINS.forEach(username => {
    const password = generatePassword();
    authData.push({ username, password, role: 'administrador' });
    report.push(`| ${username} | \`${password}\` | administrador |`);
});

// Ensure directory exists
const libDir = path.join(process.cwd(), 'src', 'lib');
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

// Save JSON for the app
fs.writeFileSync(path.join(libDir, 'auth-data.json'), JSON.stringify(authData, null, 2));

// Save Markdown report for the user
fs.writeFileSync(path.join(process.cwd(), 'credentials_report.md'), report.join('\n'));

console.log('Credentials generated successfully!');
console.log('- src/lib/auth-data.json');
console.log('- credentials_report.md');
