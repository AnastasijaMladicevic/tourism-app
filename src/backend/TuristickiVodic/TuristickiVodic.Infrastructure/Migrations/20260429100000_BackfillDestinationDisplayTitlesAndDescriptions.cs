using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TuristickiVodic.Infrastructure.Data;

#nullable disable

namespace TuristickiVodic.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260429100000_BackfillDestinationDisplayTitlesAndDescriptions")]
    public class BackfillDestinationDisplayTitlesAndDescriptions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Destinations"
                SET "DisplayTitle" = CASE "Name"
                        WHEN 'Kotorski zaliv' THEN 'Strme planine, mirna obala i gradovi uz samu vodu'
                        WHEN 'Kotor' THEN 'Zidine, trgovi i mediteranski ritam starog grada'
                        WHEN 'Budva' THEN 'Plaze, stari grad i energija koja traje do kasno'
                        WHEN 'Durmitor' THEN 'Planinski vrhovi, jezera i avantura na sve strane'
                        WHEN 'Sveti Stefan' THEN 'Ikonicno ostrvo, mirne uvale i pogled za pamcenje'
                        WHEN 'Podgorica' THEN 'Gradski ritam, reke i dobra baza za celu zemlju'
                        WHEN 'Herceg Novi' THEN 'Stepenice, tvrdjave i setnje uz more'
                        WHEN 'Bar' THEN 'Luka, Stari Bar i opustena obala za lagan obilazak'
                        WHEN 'Ulcinj' THEN 'Pesak, sunce i jug sa drugacijom energijom'
                        WHEN 'Cetinje' THEN 'Istorija, muzeji i mirniji ritam stare prestonice'
                        WHEN 'Niksic' THEN 'Trgovi, parkovi i gradski zivot okruzen prirodom'
                        WHEN 'Tivat' THEN 'Marina, setalista i moderan ritam zaliva'
                        WHEN 'Igalo' THEN 'More, wellness i lagane setnje uz obalu'
                        WHEN 'Lovcen' THEN 'Vidikovci, Njegos i planina koja cuva identitet zemlje'
                        WHEN 'Skadarsko jezero' THEN 'Camci, ptice i mir koji traje duze od izleta'
                        WHEN 'Kolasin' THEN 'Planinski vazduh, ski centri i odmor tokom cele godine'
                        WHEN 'Zabljak' THEN 'Crno jezero, Durmitor i dani puni aktivnosti'
                        WHEN 'Pluzine' THEN 'Pivsko jezero, kanjoni i mirniji planinski beg'
                        WHEN 'Andrijevica' THEN 'Komovi, reke i autenticni severni ambijent'
                        WHEN 'Plav' THEN 'Jezero, Prokletije i miran ritam severa'
                        WHEN 'Barcelona' THEN 'Gaudi, more i veceri u gotickoj cetvrti'
                        WHEN 'Madrid' THEN 'Muzeji, bulevari i gradska energija do kasno u noc'
                        WHEN 'Valencia' THEN 'Paelja, futuristicka arhitektura i mediteranski tempo'
                        WHEN 'Rome' THEN 'Rimske ulice, fontane i vecere u Trastevereu'
                        WHEN 'Venice' THEN 'Kanali, kameni prolazi i veceri oko San Marka'
                        WHEN 'Florence' THEN 'Renesansa, mostovi i toskanski ritam grada'
                        WHEN 'Belgrade' THEN 'Tvrdjava, gradske ulice i nocni ritam prestonice'
                        WHEN 'Novi Sad' THEN 'Trgovi, tvrdjava i lagani tempo uz Dunav'
                        WHEN 'Zlatibor' THEN 'Planinski vazduh, vidikovci i opusten ritam dana'
                        ELSE "DisplayTitle"
                    END,
                    "Description" = CASE "Name"
                        WHEN 'Kotorski zaliv' THEN 'Kotorski zaliv spaja mirnu morsku povrsinu, strme planine i niz istorijskih mesta uz samu obalu. Putovanje ovde lako prelazi iz setnje kroz Kotor i Perast u kratke voznje obalom, kafu uz more i sporiji mediteranski ritam. Dobar je izbor za putnike koji vole pejzaze, fotografiju i kombinaciju kulture i odmora.'
                        WHEN 'Kotor' THEN 'Kotor je istorijski grad u srcu zaliva, poznat po zidinama, trgovima i starom gradu pod zastitom UNESCO-a. Dan ovde lako krene obilaskom uskih kamenih ulica, nastavi se usponom ka tvrdjavi i zavrsi vecerom uz more. Posebno prija putnicima koji vole istoriju, atmosferu i setnje bez zurbe.'
                        WHEN 'Budva' THEN 'Budva kombinuje plaze, stari grad i energicnu turisticku scenu na malom prostoru. Posetioci mogu da provedu jutro uz more, popodne u kamenim ulicama starog grada, a vece u restoranima i barovima uz obalu. Odlicna je za one koji zele i odmor i zivlju atmosferu.'
                        WHEN 'Durmitor' THEN 'Durmitor je planinska destinacija za ljude koji traze prirodu, vazduh i aktivan dan napolju. Crno jezero, vidikovci, pesacke staze i blizina kanjona Tare cine ga odlicnim za vise dana istrazivanja. Ovde se lako prelazi iz mirne setnje u ozbiljniju avanturu, zavisno od ritma putovanja.'
                        WHEN 'Sveti Stefan' THEN 'Sveti Stefan je jedna od najupecatljivijih tacki crnogorskog primorja, prepoznatljiv po ostrvu povezanom sa kopnom. Okolina nudi mirnije uvale, panoramske poglede i elegantniji ritam odmora nego veci turisticki centri. Posebno prija putnicima koji traze lepe kadrove, tisinu i more.'
                        WHEN 'Podgorica' THEN 'Podgorica je glavni grad i prakticna baza za istrazivanje razlicitih delova Crne Gore. Grad ima siroke bulevare, reke, restorane, parkove i dovoljno urbanog ritma za kraci city break ili usputni boravak. Dobra je kada neko zeli kombinaciju svakodnevnog gradskog zivota i lakih izleta van centra.'
                        WHEN 'Herceg Novi' THEN 'Herceg Novi je grad stepenica, tvrdjava i dugih setnji uz more na ulazu u Bokokotorski zaliv. Njegovi trgovi i stare ulice daju mu izrazen karakter, dok obala ostavlja prostor za mirnije popodne i duza vecernja setalista. Posebno odgovara putnicima koji vole zeleni mediteranski ambijent i staru primorsku atmosferu.'
                        WHEN 'Bar' THEN 'Bar spaja funkcionalan primorski grad, dugu obalu i istorijski sloj Starog Bara u zaledju. Posetioci mogu da provedu dan na moru, a zatim da obilaze tvrdjavu, maslinjake i starije kamene delove grada. Dobar je za ljude koji vole da kombinuju plazu, istoriju i opusteniji ritam.'
                        WHEN 'Ulcinj' THEN 'Ulcinj nosi drugaciju energiju juga, sa dugim pescanim plazama, vetrom i opustenijom atmosferom. Velika plaza i Ada Bojana su najjaci magnet za ljubitelje sunca, vode i duzih boravaka napolju. Grad prija putnicima koji zele vise prostora, topliji mediteranski ritam i malo drugaciji kulturni ton.'
                        WHEN 'Cetinje' THEN 'Cetinje je istorijska prestonica sa muzejima, manastirima i ulicama koje cuvaju drzavnicku i kulturnu memoriju zemlje. Nije grad za zurbu, vec za sporiji obilazak, kratke pauze i fokus na price, zgrade i institucije. Posebno ce prijati ljubiteljima istorije i mirnijeg gradskog ambijenta.'
                        WHEN 'Niksic' THEN 'Niksic je sirok, pregledan grad sa trgovima, parkovima i jakim lokalnim ritmom. Osim urbanog dela, blizu su mu jezera, izletista i versko-istorijske tacke poput Ostroga. Dobar je kada neko zeli gradski boravak uz lak izlaz u prirodu.'
                        WHEN 'Tivat' THEN 'Tivat je moderan primorski grad sa marinom, setalistima i uredjenim delovima obale. Porto Montenegro mu daje elegantniji ton, ali grad ostaje lagan za setnju i prijatan za kraci odmor uz more. Odgovara putnicima koji vole savremeniji izgled obale, restorane i mirniji luksuz.'
                        WHEN 'Igalo' THEN 'Igalo je poznato po banjskom i wellness turizmu, ali i po dugim setnjama uz obalu. U blizini Herceg Novog nudi mirniji boravak, tretmane, more i vise prostora za oporavak i laganiji tempo dana. Dobro odgovara ljudima koji na putovanju zele da spoje zdravlje, odmor i setnju.'
                        WHEN 'Lovcen' THEN 'Lovcen je planina sa jakim simbolickim znacajem i jednim od najimpresivnijih vidikovaca u zemlji. Put do Njegosevog mauzoleja i pogled sa vrha cine ovu destinaciju jednom od najpamtljivijih za prvi obilazak Crne Gore. Prija putnicima koji vole panorame, planinski vazduh i osecaj prostora.'
                        WHEN 'Skadarsko jezero' THEN 'Skadarsko jezero je destinacija za sporiji boravak u prirodi, voznju camcem i posmatranje ptica. Oko jezera se smenjuju mala mesta, vidikovci, vinske tacke i mirniji ritam od morskih gradova. Posebno je dobar izbor za putnike koji traze fotografiju, prirodu i lagan dan van gradske guzve.'
                        WHEN 'Kolasin' THEN 'Kolasin je planinski grad koji dobro radi i zimi i leti. Zimi ga ljudi vezuju za ski centre, a topliji deo godine za setnje, recne doline, sumu i izlazak ka nacionalnim parkovima. Dobar je za one koji hoce uredjenu bazu za aktivan odmor u prirodi.'
                        WHEN 'Zabljak' THEN 'Zabljak je ulaz u Durmitor i jedna od najboljih baza za planinske aktivnosti u zemlji. Crno jezero, vidikovci, biciklisticke i pesacke staze, kao i zimski sadrzaji, daju mu ritam tokom cele godine. Prija putnicima koji zele prirodu na dohvat ruke od jutra do veceri.'
                        WHEN 'Pluzine' THEN 'Pluzine nude mirniji planinski boravak uz Pivsko jezero, kanjone i siroke pejzaze. Ovo je mesto za sporiji tempo, voznju, poglede i odmore koji vise zavise od prirode nego od gradske ponude. Dobar je izbor za one koji traze tisi sever zemlje.'
                        WHEN 'Andrijevica' THEN 'Andrijevica je severna planinska baza za izlete ka Komovima i Prokletijama. Reke, doline i okolne planine daju joj jednostavan, autentican karakter i dosta mogucnosti za aktivan dan napolju. Posebno prija putnicima koji vole manje sredine i planinski ambijent bez velike guzve.'
                        WHEN 'Plav' THEN 'Plav kombinuje planinsku atmosferu, jezero i blizinu Prokletija. Destinacija je pogodna za one koji vole prirodu, duze voznje, pesacenje i mirniji severni ritam. Dobro radi kao baza za vise dana istrazivanja okoline.'
                        WHEN 'Barcelona' THEN 'Barcelona spaja more, Gaudijevu arhitekturu, kvartove pune detalja i vrlo ziv gradski ritam. U istom danu mozes da obidjes Sagradu Familiju, prosetas kroz Gothic Quarter, sednes na tapas i zavrsis uz obalu. Posebno prija putnicima koji vole kombinaciju kulture, hrane i grada koji dugo ostaje budan.'
                        WHEN 'Madrid' THEN 'Madrid je grad sirokih bulevara, velikih muzeja i stalne gradske energije. Putnici ovde lako kombinuju Prado, Retiro, trznice, tapas barove i vecernji izlazak bez potrebe da zure izmedju tacki. Dobar je za city break koji trazi i kulturu i ritam velikog grada.'
                        WHEN 'Valencia' THEN 'Valencia spaja mediteranski tempo, modernu arhitekturu i poznatu gastronomsku scenu. Grad je prijatan za setnju i bicikl, a lako kombinuje istorijski centar, more i Ciudad de las Artes. Dobar je za putnike koji zele topliji i opusteniji ritam od vecih evropskih prestonica.'
                        WHEN 'Rome' THEN 'Rim je grad u kojem se svakodnevni ritam mesa sa antickim slojevima istorije, trgovima, fontanama i dugim vecerama. Putnik u jednom danu moze da obidje Koloseum, da sedne na kafu u malom baru i da zavrsi vece uz testeninu i vino u Trastevereu. Zbog tog spoja velikih znamenitosti i malih kvartovskih trenutaka, Rim je dobar i za prvi dolazak i za sporiji povratak.'
                        WHEN 'Venice' THEN 'Venecija nudi sporiji ritam obilaska, setnje preko mostova i male gastronomske pauze uz poglede na kanale. Grad je posebno zanimljiv putnicima koji vole atmosferu, umetnost i osecaj da je gotovo svaka ulica scenografija. Najvise prija kada se obilazi bez velike zurbe, uz vreme za male prolaze, trgove i zalaske sunca.'
                        WHEN 'Florence' THEN 'Firenca spaja umetnost, zanatstvo i toskansku gastronomiju na malom prostoru koji je lako obici peske. Grad je odlican za putnike koji zele da kombinuju muzeje, panoramske poglede, lagan gradski tempo i ozbiljno dobru hranu. Posebno je lepa za one koji vole da im se kultura i svakodnevni zivot preplicu iz ulice u ulicu.'
                        WHEN 'Belgrade' THEN 'Beograd je grad sirokih bulevara, tvrdjave iznad usca i kafana koje zive do kasno. Posetioci ovde lako kombinuju istorijske tacke, moderni gradski ritam, dobru kafu i vecere koje se cesto produze vise nego sto je planirano. Dobar je izbor za putnike koji vole energiju velikog grada, ali i spontane male pauze pored reke.'
                        WHEN 'Novi Sad' THEN 'Novi Sad ima mirniji ritam, ali bogat gradski sadrzaj, uredjene trgove, dobru gastronomsku scenu i jak kulturni identitet. Posebno je prijatan za putnike koji vole setnju, dobru hranu i pogled sa Petrovaradina prema Dunavu i gradu. Grad lako ostavlja utisak mesta u kome mozes i da obilazis i da usporis.'
                        WHEN 'Zlatibor' THEN 'Zlatibor je destinacija za sporiji planinski ritam, panoramske poglede, duge setnje i odmor uz lokalne specijalitete. Pogodan je i za kratke vikend odmore i za duze boravke kada neko zeli da kombinuje prirodu, wellness i lakse aktivnosti napolju. Posebno odgovara putnicima koji hoce uredjenu planinsku bazu bez prevelikog napora oko organizacije.'
                        ELSE "Description"
                    END,
                    "UpdatedAt" = NOW()
                WHERE "Name" IN (
                    'Kotorski zaliv', 'Kotor', 'Budva', 'Durmitor', 'Sveti Stefan', 'Podgorica',
                    'Herceg Novi', 'Bar', 'Ulcinj', 'Cetinje', 'Niksic', 'Tivat', 'Igalo', 'Lovcen',
                    'Skadarsko jezero', 'Kolasin', 'Zabljak', 'Pluzine', 'Andrijevica', 'Plav',
                    'Barcelona', 'Madrid', 'Valencia', 'Rome', 'Venice', 'Florence', 'Belgrade',
                    'Novi Sad', 'Zlatibor'
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
