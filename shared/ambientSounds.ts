export type AmbientSoundCategory = 'noise' | 'nature'
export type AmbientSoundFormat = 'mp3' | 'ogg'

export interface AmbientSoundDefinition {
  id: string
  title: string
  category: AmbientSoundCategory
  format: AmbientSoundFormat
  bytes: number
  sha256: string
  url: string
  author: string
  sourceUrl: string
  license: string
  licenseUrl: string
  attribution: string
}

export interface AmbientSoundItemStatus extends AmbientSoundDefinition {
  installed: boolean
}

export interface AmbientSoundStatus {
  installed: boolean
  installing: boolean
  downloadBytes: number
  installedBytes: number
  sounds: AmbientSoundItemStatus[]
  installingSoundId?: string | null
  failures?: Record<string, string>
}

export const AMBIENT_SOUNDS: readonly AmbientSoundDefinition[] = [
  {
    id: 'white',
    title: 'Rumore bianco',
    category: 'noise',
    format: 'mp3',
    bytes: 232416,
    sha256: '7744dc5bcdd5c1913f584c2389ddc2b860e3ec5e818ab8dcaf9175ea6e2a0630',
    url: 'https://cdn.freesound.org/previews/349/349315_4067257-hq.mp3',
    author: 'newagesoup',
    sourceUrl: 'https://freesound.org/people/newagesoup/sounds/349315/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'newagesoup (Freesound #349315, CC0 1.0 Universal)'
  },
  {
    id: 'pink',
    title: 'Rumore rosa',
    category: 'noise',
    format: 'mp3',
    bytes: 233760,
    sha256: 'c23e7b346309371fabff5f3666fa3406278eebcbeb131b1938f383547509dbd7',
    url: 'https://cdn.freesound.org/previews/349/349312_4067257-hq.mp3',
    author: 'newagesoup',
    sourceUrl: 'https://freesound.org/people/newagesoup/sounds/349312/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'newagesoup (Freesound #349312, CC0 1.0 Universal)'
  },
  {
    id: 'brown',
    title: 'Rumore marrone',
    category: 'noise',
    format: 'mp3',
    bytes: 232704,
    sha256: 'bf9eedbc84f15c4851ab30c7201d9400c148f5ddfb491539f31e30b8843ba269',
    url: 'https://cdn.freesound.org/previews/349/349314_4067257-hq.mp3',
    author: 'newagesoup',
    sourceUrl: 'https://freesound.org/people/newagesoup/sounds/349314/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'newagesoup (Freesound #349314, CC0 1.0 Universal)'
  },
  {
    id: 'rain',
    title: 'Pioggia',
    category: 'nature',
    format: 'ogg',
    bytes: 3133874,
    sha256: 'b84c1daf259a24283be40b7663656d17676df4eb60c1e0332820570db891848a',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/rain.ogg',
    author: 'alex36917; adattamento Porrumentzio (Blanket)',
    sourceUrl: 'https://freesound.org/people/alex36917/sounds/524605/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      'alex36917 (Freesound #524605, CC BY 4.0), adattamento audio di Porrumentzio per Blanket'
  },
  {
    id: 'waves',
    title: 'Onde dell’oceano',
    category: 'nature',
    format: 'ogg',
    bytes: 2765739,
    sha256: '20e1aec7c7542f71645275871650881ea33bc92bd9816b243ea920bb1daa51a0',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/waves.ogg',
    author: 'Luftrum; adattamento Porrumentzio (Blanket)',
    sourceUrl: 'https://freesound.org/people/Luftrum/sounds/48412/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution:
      'Luftrum (Freesound #48412, CC BY 4.0), adattamento audio di Porrumentzio per Blanket'
  },
  {
    id: 'stream',
    title: 'Ruscello',
    category: 'nature',
    format: 'ogg',
    bytes: 5025476,
    sha256: 'ce372c5db561168636647dd7d4aac39ef1785ae5d415ad0e589186ce1b7c5796',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/stream.ogg',
    author: 'gluckose (Blanket)',
    sourceUrl: 'https://freesound.org/people/gluckose/sounds/333987/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'gluckose (Freesound #333987, CC0 1.0 Universal), Blanket'
  },
  {
    id: 'birds',
    title: 'Canto degli uccelli',
    category: 'nature',
    format: 'ogg',
    bytes: 3063230,
    sha256: 'e59b19c2a377d5835d07e7ec8f8c876b9f40ae7f703738b55d616ef96a1638b2',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/birds.ogg',
    author: 'kvgarlic',
    sourceUrl: 'https://freesound.org/people/kvgarlic/sounds/156826/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'kvgarlic (CC0 1.0); adattamento Porrumentzio (Blanket)'
  },
  {
    id: 'fireplace',
    title: 'Fuoco scoppiettante',
    category: 'nature',
    format: 'ogg',
    bytes: 325065,
    sha256: 'a6395379a32c2dc30dd870c4571ded4a5311435aacfe354b3a82a9b3ab98620b',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/fireplace.ogg',
    author: 'ezwa',
    sourceUrl: 'https://soundbible.com/1543-Fireplace.html',
    license: 'Public Domain',
    licenseUrl: 'https://soundbible.com/1543-Fireplace.html',
    attribution: 'ezwa (Public Domain); Blanket'
  },
  {
    id: 'storm',
    title: 'Temporale',
    category: 'nature',
    format: 'ogg',
    bytes: 486147,
    sha256: '7e2a9bee62273b1deb169b6f7a308b70ead6ae450d3f6c75b854a44e4bef7b5a',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/storm.ogg',
    author: 'digifishmusic',
    sourceUrl: 'https://freesound.org/people/digifishmusic/sounds/41739/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'digifishmusic (CC BY 4.0); adattamento Porrumentzio (Blanket)'
  },
  {
    id: 'summer-night',
    title: 'Notte estiva con grilli',
    category: 'nature',
    format: 'ogg',
    bytes: 612962,
    sha256: '2eb2efb8f5c6733e74dc8546f2ecfac40407e8242a9eed96a72e0fc68790ac6f',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/summer-night.ogg',
    author: 'Lisa Redfern',
    sourceUrl: 'https://soundbible.com/2083-Crickets-Chirping-At-Night.html',
    license: 'Public Domain',
    licenseUrl: 'https://soundbible.com/2083-Crickets-Chirping-At-Night.html',
    attribution: 'Lisa Redfern (Public Domain); Blanket'
  },
  {
    id: 'wind',
    title: 'Vento nella natura',
    category: 'nature',
    format: 'ogg',
    bytes: 289537,
    sha256: 'cfdc81be69cd5f434ebfeb708bdf094725f3052d76691f550ff0e10eee3e32d2',
    url: 'https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/wind.ogg',
    author: 'felix.blume',
    sourceUrl: 'https://freesound.org/people/felix.blume/sounds/217506/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'felix.blume (CC0 1.0); adattamento Porrumentzio (Blanket)'
  },
  {
    id: 'breeze',
    title: 'Brezza all’aperto',
    category: 'nature',
    format: 'ogg',
    bytes: 3200466,
    sha256: 'debd59186e58b751eba29de80e1368c3234526f1efc89a91b40ce469cffb1479',
    url: 'https://raw.githubusercontent.com/Muges/ambientsounds/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/wind.ogg',
    author: 'felix.blume',
    sourceUrl: 'https://freesound.org/people/felix.blume/sounds/139337/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'felix.blume (CC0 1.0); selezione e loop AmbientSounds'
  },
  {
    id: 'heavy-rain',
    title: 'Pioggia intensa',
    category: 'nature',
    format: 'ogg',
    bytes: 1027707,
    sha256: '3fdda0b1e8dcdc47eea51cc003208d590a7aea67693e16af8029ac538c197e8e',
    url: 'https://raw.githubusercontent.com/Muges/ambientsounds/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/heavy-rain.ogg',
    author: 'DWOBoyle (D W)',
    sourceUrl: 'https://freesound.org/people/DWOBoyle/sounds/136971/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'DWOBoyle (D W) (CC BY 4.0); selezione e loop AmbientSounds'
  },
  {
    id: 'forest-stream',
    title: 'Ruscello gorgogliante',
    category: 'nature',
    format: 'ogg',
    bytes: 1777247,
    sha256: '42c5e7e70dbe7d0f9153004f675a33135a144f667f3a8417c11b9019b49092ce',
    url: 'https://raw.githubusercontent.com/Muges/ambientsounds/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/stream.ogg',
    author: 'mystiscool',
    sourceUrl: 'https://freesound.org/people/mystiscool/sounds/7138/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'mystiscool (CC BY 4.0); selezione e loop AmbientSounds'
  },
  {
    id: 'rain-thunder',
    title: 'Pioggia e tuoni',
    category: 'nature',
    format: 'ogg',
    bytes: 4167282,
    sha256: 'fa810bcf1559ae1b9517dd95895d7a2a8767a7c077463eaaae8e50e675411387',
    url: 'https://raw.githubusercontent.com/Muges/ambientsounds/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/thunderstorm.ogg',
    author: 'RHumphries',
    sourceUrl: 'https://freesound.org/people/RHumphries/sounds/2523/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'RHumphries (CC BY 4.0); selezione e loop AmbientSounds'
  },
  {
    id: 'campfire',
    title: 'Focolare naturale',
    category: 'nature',
    format: 'ogg',
    bytes: 2292050,
    sha256: 'd4a66a650c48ae83f60a8608c2fd4a58f99841e0b254c84f66c850fddbff6d40',
    url: 'https://raw.githubusercontent.com/Muges/ambientsounds/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/fireplace.ogg',
    author: 'inchadney',
    sourceUrl: 'https://freesound.org/people/inchadney/sounds/132534/',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'inchadney (CC0 1.0); selezione e loop AmbientSounds'
  }
]
