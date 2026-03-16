
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
    'Najveća planina u Srbiji i najpopularnije ski-središte. Kopaonik nudi neverovatne pejzaže, čist planinski vazduh i bogatu floru — dom je više od 50 endemskih biljnih vrsta. Leti pruža odlične mogućnosti za planinarenje i biciklizam, dok zimi postaje skijaški raj sa preko 55 km ski-staza.',
    'Kopaonik',
    'Srbija',
    '11111111-0000-0000-0000-000000000001',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Kopaonik_ski_resort.jpg/1280px-Kopaonik_ski_resort.jpg'
),
(
    '22222222-0000-0000-0000-000000000002',
    'Đavolja varoš',
    'Jedinstvena prirodna pojava — 202 zemljane figure visoke do 15 metara, nastale erozijom tla tokom miliona godina. Proglašena jednom od sedam prirodnih čuda Srbije. Kamene lutke, kako ih mještani zovu, stvaraju misterioznu atmosferu koja privlači turiste iz celog sveta.',
    'Kuršumlija',
    'Srbija',
    '11111111-0000-0000-0000-000000000005',
    NULL
),
(
    '22222222-0000-0000-0000-000000000003',
    'Novi Sad',
    'Drugi po veličini grad u Srbiji, poznat kao kulturna prestonica. Tvrđava Petrovaradin dominira gradom sa uzvišice iznad Dunava. Novi Sad je domaćin EXIT festivala, jednog od najvećih muzičkih festivala u Evropi, koji se svake godine održava upravo na tvrđavi.',
    'Novi Sad',
    'Srbija',
    '11111111-0000-0000-0000-000000000002',
    NULL
),
(
    '22222222-0000-0000-0000-000000000004',
    'Uvac',
    'Specijalni rezervat prirode u jugozapadnoj Srbiji. Reka Uvac pravi spektakularne meandre kroz klisuru duboku i do 300 metara. Dom je najveće kolonije beloglavog supa u Srbiji. Panoramski pogled sa vidikovca Molitva jedan je od najlepših u celoj zemlji.',
    'Nova Varoš',
    'Srbija',
    '11111111-0000-0000-0000-000000000003',
    NULL
),
(
    '22222222-0000-0000-0000-000000000005',
    'Gamzigrad — Romuliana',
    'Kasnoantički carski kompleks iz 3. i 4. veka, upisan na listu UNESCO svetske baštine. Podigao ga je rimski car Galerije u čast svoje majke Romule. Kompleks uključuje palace, hramove i mozaike očuvane u izuzetnom stanju.',
    'Zaječar',
    'Srbija',
    '11111111-0000-0000-0000-000000000004',
    NULL
),
(
    '22222222-0000-0000-0000-000000000006',
    'Zlatibor',
    'Planinski resort u zapadnoj Srbiji na nadmorskoj visini od oko 1000 metara. Poznat po blažoj klimi, prostranim livadama i autentičnoj seoskoj arhitekturi. Gondolom Zlatibor — Tornik pruža nezaboravan pogled na zlatibορske šume i doline.',
    'Čajetina',
    'Srbija',
    '11111111-0000-0000-0000-000000000001',
    NULL
);


INSERT INTO recenzije (destinacija_id, autor_naziv, ocena, komentar) VALUES
-- Kopaonik
('22222222-0000-0000-0000-000000000001', 'Marko Jovanović', 5, 'Neverovatno mesto! Bili smo u januaru, sneg je bio odličan. Staze su dobro uređene i za sve nivoe. Svakako se vraćamo.'),
('22222222-0000-0000-0000-000000000001', 'Ana Nikolić',     4, 'Lepa planina, dobra infrastruktura. Jedini minus je što je poprilično skupo tokom vrhunca sezone. Preporučujem početak marta.'),
('22222222-0000-0000-0000-000000000001', 'Stefan Petrović', 5, 'Letnja poseta bila je fenomenalna. Planinarili smo do Pančićevog vrha, pogled je zadivljujući.'),

-- Đavolja varoš
('22222222-0000-0000-0000-000000000002', 'Jelena Đorđević', 5, 'Nezaboravno iskustvo! Ovo treba videti bar jednom u životu. Preporučujem izlazak pri zalazu sunca kada senke daju poseban efekat.'),
('22222222-0000-0000-0000-000000000002', 'Milan Stanković', 4, 'Impresivno prirodno čudo. Staza je dobro označena. Posetite i izvor crvene vode koji je u blizini.'),

-- Novi Sad
('22222222-0000-0000-0000-000000000003', 'Ivana Milić',     5, 'Grad koji se mora posetiti! Petrovaradin je impozantan, a kafići u podgrađu su fantastični. Grad je čist i bezbedan.'),
('22222222-0000-0000-0000-000000000003', 'Nikola Lazić',    4, 'Odličan grad za vikend putovanje. Bogata kulturna scena, dobra gastronomija. Saobraćaj može biti problem.'),

-- Uvac
('22222222-0000-0000-0000-000000000004', 'Maja Tomić',      5, 'Jedan od najlepših prizora koje sam videla u životu! Meandri reke Uvac gledani sa vidikovca su nešto posebno. Obavezno!'),
('22222222-0000-0000-0000-000000000004', 'Aleksandar Ilić', 5, 'Supi u letu su neverovatni. Čamac se iznajmljuje na licu mesta, prošetali smo klisurom. Priroda na svom vrhuncu.'),

-- Gamzigrad
('22222222-0000-0000-0000-000000000005', 'Tatjana Savić',   4, 'Fascinantna istorija. Mozaici su odlično očuvani. Muzej uz kompleks pruža dobar kontekst. Preporučujem audio vodič.'),

-- Zlatibor
('22222222-0000-0000-0000-000000000006', 'Dragan Vasić',    4, 'Mirna planina, idealna za odmor od gradske vreve. Gondola je odlična atrakcija za decu. Lokalna hrana je autentična i ukusna.'),
('22222222-0000-0000-0000-000000000006', 'Vesna Cvetković', 5, 'Bili smo u jesen — boje šume su bile neverovatne. Šetali smo satima bez umora. Već planiramo povratak.');