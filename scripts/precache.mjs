// Après « vite build » : liste les fichiers de l'application et fabrique le service worker versionné.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const dist = 'dist'
const fichiers = []
const parcourir = (dossier) => {
  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom)
    if (fs.statSync(chemin).isDirectory()) { if (nom !== 'bibles') parcourir(chemin) } // les Bibles se gardent à la première lecture
    else fichiers.push(chemin)
  }
}
parcourir(dist)

const urls = fichiers.map((f) => '/' + path.relative(dist, f).split(path.sep).join('/')).filter((u) => u !== '/sw.js').sort()
const empreinte = crypto.createHash('sha1')
for (const u of urls) empreinte.update(u).update(fs.readFileSync(path.join(dist, u)))
const version = empreinte.digest('hex').slice(0, 10)

const cheminSw = path.join(dist, 'sw.js')
const sw = fs.readFileSync(cheminSw, 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(urls))
fs.writeFileSync(cheminSw, sw)
console.log(`Service worker ${version} : ${urls.length} fichiers préchargés`)
