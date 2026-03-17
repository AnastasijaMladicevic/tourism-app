
INSERT INTO kategorije (id, naziv, ikonica) VALUES
    ('11111111-0000-0000-0000-000000000001', 'Planine',   '⛰️'),
    ('11111111-0000-0000-0000-000000000002', 'Gradovi',   '🏙️'),
    ('11111111-0000-0000-0000-000000000003', 'Reke',      '🏞️'),
    ('11111111-0000-0000-0000-000000000004', 'Istorija',  '🏛️'),
    ('11111111-0000-0000-0000-000000000005', 'Priroda',   '🌿');

INSERT INTO destinacije (id, naziv, opis, lokacija, zemlja, kategorija_id, url_slike) VALUES
(
    '22222222-0000-0000-0000-000000000001',
    'Kopaonik',
    'Najveca planina u Srbiji i najpopularnije ski-srediste. Kopaonik nudi neverovatne pejzaze, cist planinski vazduh i bogatu floru — dom je vise od 50 endemskih biljnih vrsta. Leti pruza odlicne mogucnosti za planinarenje i biciklizam, dok zimi postaje skijaski raj sa preko 55 km ski-staza.',
    'Kopaonik',
    'Srbija',
    '11111111-0000-0000-0000-000000000001',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Kopaonik_ski_resort.jpg/1280px-Kopaonik_ski_resort.jpg'
),
(
    '22222222-0000-0000-0000-000000000002',
    'Djavolja varos',
    'Jedinstvena prirodna pojava — 202 zemljane figure visoke do 15 metara, nastale erozijom tla tokom miliona godina. Proglasena jednom od sedam prirodnih cuda Srbije. Kamene lutke, kako ih mjestani zovu, stvaraju misterioznu atmosferu koja privlaci turiste iz celog sveta.',
    'Kursumlija',
    'Srbija',
    '11111111-0000-0000-0000-000000000005',
    NULL
),
(
    '22222222-0000-0000-0000-000000000003',
    'Novi Sad',
    'Drugi po velicini grad u Srbiji, poznat kao kulturna prestonica. Tvrdjava Petrovaradin dominira gradom sa uzvisice iznad Dunava. Novi Sad je domacin EXIT festivala, jednog od najvecih muzickih festivala u Evropi, koji se svake godine odrzava upravo na tvrdjavi.',
    'Novi Sad',
    'Srbija',
    '11111111-0000-0000-0000-000000000002',
    NULL
),
(
    '22222222-0000-0000-0000-000000000004',
    'Uvac',
    'Specijalni rezervat prirode u jugozapadnoj Srbiji. Reka Uvac pravi spektakularne meandre kroz klisuru duboku i do 300 metara. Dom je najvece kolonije beloglavog supa u Srbiji. Panoramski pogled sa vidikovca Molitva jedan je od najlepsih u celoj zemlji.',
    'Nova Varos',
    'Srbija',
    '11111111-0000-0000-0000-000000000003',
    NULL
),
(
    '22222222-0000-0000-0000-000000000005',
    'Gamzigrad — Romuliana',
    'Kasnoanticki carski kompleks iz 3. i 4. veka, upisan na listu UNESCO svetske bastine. Podigao ga je rimski car Galerije u cast svoje majke Romule. Kompleks ukljucuje palace, hramove i mozaike ocuvane u izuzetnom stanju.',
    'Zajecar',
    'Srbija',
    '11111111-0000-0000-0000-000000000004',
    NULL
),
(
    '22222222-0000-0000-0000-000000000006',
    'Zlatibor',
    'Planinski resort u zapadnoj Srbiji na nadmorskoj visini od oko 1000 metara. Poznat po blazoj klimi, prostranim livadama i autenticnoj seoskoj arhitekturi. Gondolom Zlatibor — Tornik pruza nezaboravan pogled na zlatibορske sume i doline.',
    'cajetina',
    'Srbija',
    '11111111-0000-0000-0000-000000000001',
    NULL
);


INSERT INTO recenzije (destinacija_id, autor_naziv, ocena, komentar) VALUES
-- Kopaonik
('22222222-0000-0000-0000-000000000001', 'Marko Jovanovic', 5, 'Neverovatno mesto! Bili smo u januaru, sneg je bio odlican. Staze su dobro uredjene i za sve nivoe. Svakako se vracamo.'),
('22222222-0000-0000-0000-000000000001', 'Ana Nikolic',     4, 'Lepa planina, dobra infrastruktura. Jedini minus je sto je poprilicno skupo tokom vrhunca sezone. Preporucujem pocetak marta.'),
('22222222-0000-0000-0000-000000000001', 'Stefan Petrovic', 5, 'Letnja poseta bila je fenomenalna. Planinarili smo do Pancicevog vrha, pogled je zadivljujuci.'),

-- djavolja varos
('22222222-0000-0000-0000-000000000002', 'Jelena djordjevic', 5, 'Nezaboravno iskustvo! Ovo treba videti bar jednom u zivotu. Preporucujem izlazak pri zalazu sunca kada senke daju poseban efekat.'),
('22222222-0000-0000-0000-000000000002', 'Milan Stankovic', 4, 'Impresivno prirodno cudo. Staza je dobro oznacena. Posetite i izvor crvene vode koji je u blizini.'),

-- Novi Sad
('22222222-0000-0000-0000-000000000003', 'Ivana Milic',     5, 'Grad koji se mora posetiti! Petrovaradin je impozantan, a kafici u podgradju su fantasticni. Grad je cist i bezbedan.'),
('22222222-0000-0000-0000-000000000003', 'Nikola Lazic',    4, 'Odlican grad za vikend putovanje. Bogata kulturna scena, dobra gastronomija. Saobracaj moze biti problem.'),

-- Uvac
('22222222-0000-0000-0000-000000000004', 'Maja Tomic',      5, 'Jedan od najlepsih prizora koje sam videla u zivotu! Meandri reke Uvac gledani sa vidikovca su nesto posebno. Obavezno!'),
('22222222-0000-0000-0000-000000000004', 'Aleksandar Ilic', 5, 'Supi u letu su neverovatni. camac se iznajmljuje na licu mesta, prosetali smo klisurom. Priroda na svom vrhuncu.'),

-- Gamzigrad
('22222222-0000-0000-0000-000000000005', 'Tatjana Savic',   4, 'Fascinantna istorija. Mozaici su odlicno ocuvani. Muzej uz kompleks pruza dobar kontekst. Preporucujem audio vodic.'),

-- Zlatibor
('22222222-0000-0000-0000-000000000006', 'Dragan Vasic',    4, 'Mirna planina, idealna za odmor od gradske vreve. Gondola je odlicna atrakcija za decu. Lokalna hrana je autenticna i ukusna.'),
('22222222-0000-0000-0000-000000000006', 'Vesna Cvetkovic', 5, 'Bili smo u jesen — boje sume su bile neverovatne. setali smo satima bez umora. Vec planiramo povratak.');