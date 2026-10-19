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
    attribution: 'alex36917 (Freesound #524605, CC BY 4.0), adattamento audio di Porrumentzio per Blanket'
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
    attribution: 'Luftrum (Freesound #48412, CC BY 4.0), adattamento audio di Porrumentzio per Blanket'
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
  }
]
