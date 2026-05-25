import { Injectable, effect, signal } from '@angular/core';

export type AppLanguage = 'me' | 'sr' | 'en' | 'es' | 'it';
type TranslationLocale = 'sr' | 'en';

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  me: 'language.montenegrin',
  sr: 'language.serbian',
  en: 'language.english',
  es: 'language.spanish',
  it: 'language.italian',
};

const TRANSLATIONS: Record<string, Record<TranslationLocale, string>> = {
  'common.back': { sr: 'Nazad', en: 'Back' },
  'common.loading': { sr: 'Ucitavanje...', en: 'Loading...' },
  'common.save': { sr: 'Sacuvaj', en: 'Save' },
  'common.cancel': { sr: 'Otkazi', en: 'Cancel' },
  'common.remove': { sr: 'Ukloni', en: 'Remove' },
  'common.close': { sr: 'Zatvori', en: 'Close' },
  'common.details': { sr: 'Detalji', en: 'Details' },
  'common.retry': { sr: 'Pokusaj ponovo', en: 'Try again' },
  'common.notAvailable': { sr: 'Nije dostupno', en: 'Not available' },
  'common.dateNotAvailable': { sr: 'Datum nije dostupan', en: 'Date not available' },
  'common.emailNotAvailable': { sr: 'Email nije dostupan', en: 'Email not available' },
  'common.savedOn': { sr: 'Sacuvano', en: 'Saved' },
  'common.publishedOn': { sr: 'Objavljeno', en: 'Published' },
  'common.openNow': { sr: 'OTVORENO', en: 'OPEN NOW' },
  'common.closed': { sr: 'ZATVORENO', en: 'CLOSED' },
  'common.new': { sr: 'Novo', en: 'New' },
  'common.reviews': { sr: 'recenzije', en: 'reviews' },
  'common.reviewsTitle': { sr: 'Recenzije', en: 'Reviews' },
  'common.seeAll': { sr: 'Prikazi sve >', en: 'See All >' },
  'common.viewAll': { sr: 'Vidi sve >', en: 'View All >' },
  'common.gallery': { sr: 'Galerija', en: 'Gallery' },
  'common.location': { sr: 'Lokacija', en: 'Location' },
  'common.viewOnMap': { sr: 'Pogledaj na mapi', en: 'View on Map' },
  'common.bookNow': { sr: 'Rezervisi odmah', en: 'Book Now' },
  'common.addReview': { sr: 'Dodaj recenziju', en: 'Add review' },
  'common.contactInfo': { sr: 'Kontakt informacije', en: 'Contact info' },
  'common.price': { sr: 'Cena', en: 'Price' },
  'common.startingFrom': { sr: 'Od', en: 'Starting from' },
  'common.about': { sr: 'O nama', en: 'About' },

  'nav.home': { sr: 'Pocetna', en: 'Home' },
  'nav.map': { sr: 'Mapa', en: 'Map' },
  'nav.favorites': { sr: 'Favoriti', en: 'Favorites' },
  'nav.planner': { sr: 'Planer', en: 'Planner' },
  'nav.profile': { sr: 'Profil', en: 'Profile' },

  'profile.title': { sr: 'Profil', en: 'Profile' },
  'profile.edit': { sr: 'Uredi', en: 'Edit' },
  'profile.activeAccount': { sr: 'Aktivan nalog', en: 'Active account' },
  'profile.defaultUser': { sr: 'SpireGO korisnik', en: 'SpireGO user' },
  'profile.stats.favorites': { sr: 'FAVORITI', en: 'FAVORITES' },
  'profile.stats.reviews': { sr: 'RECENZIJE', en: 'REVIEWS' },
  'profile.section.trips': { sr: 'MOJA PUTOVANJA', en: 'MY TRIPS' },
  'profile.section.settings': { sr: 'PODESAVANJA', en: 'SETTINGS' },
  'profile.section.account': { sr: 'NALOG', en: 'ACCOUNT' },
  'profile.favorites': { sr: 'Favoriti', en: 'Favorites' },
  'profile.myReviews': { sr: 'Moje recenzije', en: 'My reviews' },
  'profile.language': { sr: 'Jezik', en: 'Language' },
  'profile.region': { sr: 'Region', en: 'Region' },
  'profile.support': { sr: 'Pomoc i podrska', en: 'Help and support' },
  'profile.privacy': { sr: 'Privatnost i podaci', en: 'Privacy and data' },
  'profile.terms': { sr: 'Uslovi koriscenja', en: 'Terms of use' },
  'profile.moderator': { sr: 'Zatrazi dozvolu za moderatora', en: 'Request moderator access' },
  'profile.about': { sr: 'O nama', en: 'About us' },
  'profile.logout': { sr: 'Odjavi se', en: 'Log out' },

  'region.title': { sr: 'Region', en: 'Region' },
  'region.available': { sr: 'Dostupni regioni', en: 'Available regions' },
  'region.infoTitle': { sr: 'Promena regiona se primenjuje odmah', en: 'Region changes apply instantly' },
  'region.infoBody': {
    sr: 'Nakon cuvanja, kompletan mobilni interfejs ce odmah biti prikazan na izabranom regionu.',
    en: 'After saving, the entire mobile interface will switch to the selected region immediately.',
  },
  'region.montenegro': { sr: 'Crna Gora', en: 'Montenegro' },
  'region.spain': { sr: 'Španija', en: 'Spain' },
  'region.defaultBadge': { sr: 'Podrazumevano', en: 'Default' },
  'region.active': { sr: 'Region je vec aktivan.', en: 'This region is already active.' },
  'region.saved': { sr: 'Region je uspesno azuriran.', en: 'Region was updated successfully.' },
  'region.saveFailed': { sr: 'Promena regiona nije sacuvana.', en: 'Region change was not saved.' },
  'region.loadFailed': { sr: 'Regioni trenutno nisu dostupni.', en: 'Regions are currently unavailable.' },
  'region.noneAvailable': { sr: 'Nema dostupnih regiona.', en: 'No regions are available.' },
  'language.title': { sr: 'Jezik', en: 'Language' },
  'language.available': { sr: 'Dostupni jezici', en: 'Available languages' },
  'language.infoTitle': {
    sr: 'Promena jezika se primenjuje odmah',
    en: 'Language changes apply instantly',
  },
  'language.infoBody': {
    sr: 'Nakon cuvanja, mobilni interfejs ce odmah biti prikazan na izabranom jeziku.',
    en: 'After saving, the mobile interface will immediately switch to the selected language.',
  },
  'language.active': { sr: 'Jezik je vec aktivan.', en: 'This language is already active.' },
  'language.saveFailed': { sr: 'Promena jezika nije sacuvana.', en: 'Language change was not saved.' },
  'language.saved': { sr: 'Jezik je uspesno azuriran.', en: 'Language was updated successfully.' },
  'language.saving': { sr: 'Cuvanje...', en: 'Saving...' },
  'language.apply': { sr: 'Primeni jezik', en: 'Apply language' },
  'language.confirm': {
    sr: 'Klikom na dugme potvrdujete promenu jezika aplikacije na {{language}}.',
    en: 'By tapping the button you confirm switching the app language to {{language}}.',
  },
  'region.apply': { sr: 'Primeni region', en: 'Apply region' },
  'region.confirm': {
    sr: 'Klikom na dugme potvrdujete promenu regiona aplikacije na {{language}}.',
    en: 'By tapping the button you confirm switching the app region to {{language}}.',
  },
  'language.montenegrin': { sr: 'Crnogorski', en: 'Montenegrin' },
  'language.serbian': { sr: 'Srpski', en: 'Serbian' },
  'language.english': { sr: 'English', en: 'English' },
  'language.spanish': { sr: 'Španski', en: 'Spanish' },
  'language.italian': { sr: 'Italijanski', en: 'Italian' },

  'favorites.heroEyebrow': { sr: 'FAVORITI', en: 'FAVORITES' },
  'favorites.heroTitle': {
    sr: 'Tvoje omiljene stavke su na jednom mestu.',
    en: 'All of your favorite objects are in one place.',
  },
  'favorites.heroBody': {
    sr: 'Pregledaj sve sto si dodao u favorite i brzo ukloni stavke koje vise ne zelis da cuvas.',
    en: 'Browse everything you added to favorites and quickly remove items you no longer want to keep.',
  },
  'favorites.loadError': {
    sr: 'Favoriti trenutno nisu dostupni.',
    en: 'Favorites are currently unavailable.',
  },
  'favorites.removeError': {
    sr: 'Favorit nije uklonjen. Pokusaj ponovo.',
    en: 'The favorite item could not be removed. Please try again.',
  },
  'favorites.loadingBody': { sr: 'Pripremamo tvoje favorite.', en: 'We are preparing your favorites.' },
  'favorites.emptyTitle': { sr: 'Jos nemas favorita', en: 'You do not have any favorites yet' },
  'favorites.emptyBody': {
    sr: 'Kada dodas destinaciju ili objekat u favorite, ovde ce se pojaviti.',
    en: 'When you add a destination or object to favorites, it will appear here.',
  },
  'favorites.removing': { sr: 'Uklanjanje...', en: 'Removing...' },
  'favorites.type.default': { sr: 'Favorit', en: 'Favorite' },
  'favorites.type.destination': { sr: 'Destinacija', en: 'Destination' },
  'favorites.type.object': { sr: 'Objekat', en: 'Object' },
  'favorites.type.activity': { sr: 'Aktivnost', en: 'Activity' },
  'favorites.type.route': { sr: 'Ruta', en: 'Route' },
  'favorites.type.locality': { sr: 'Mesto', en: 'Place' },
  'favorites.fallbackTitle': { sr: 'Favorit #{{id}}', en: 'Favorite #{{id}}' },

  'reviews.title': { sr: 'Moje recenzije', en: 'My reviews' },
  'reviews.heroEyebrow': { sr: 'TVOJ UTISAK', en: 'YOUR FEEDBACK' },
  'reviews.heroTitle': {
    sr: 'Sve recenzije koje si ostavio nalaze se ovde.',
    en: 'All reviews you have left are shown here.',
  },
  'reviews.heroBody': {
    sr: 'Pregledaj sta si ocenio, kada je komentar ostavljen i da li postoji odgovor.',
    en: 'Review what you rated, when the comment was left, and whether there is a response.',
  },
  'reviews.loadError': { sr: 'Tvoje recenzije trenutno nisu dostupne.', en: 'Your reviews are currently unavailable.' },
  'reviews.loadingBody': { sr: 'Pripremamo tvoje recenzije.', en: 'We are preparing your reviews.' },
  'reviews.emptyTitle': { sr: 'Jos nemas recenzija', en: 'You do not have any reviews yet' },
  'reviews.emptyBody': {
    sr: 'Kada ostavis komentar na objekat ili destinaciju, ovde ces ga videti.',
    en: 'When you leave a comment on an object or destination, it will appear here.',
  },
  'reviews.objectFallback': { sr: 'Objekat bez naziva', en: 'Unnamed place' },
  'reviews.textFallback': { sr: 'Recenzija nema dodatni komentar.', en: 'This review has no additional comment.' },
  'reviews.statusFallback': { sr: 'Bez statusa', en: 'No status' },
  'reviews.ratingAria': { sr: 'Ocena {{rating}}', en: 'Rating {{rating}}' },
  'reviews.creatorResponse': { sr: 'Odgovor kreatora', en: 'Creator response' },

  'moderator.title': { sr: 'Pristup moderatoru', en: 'Moderator access' },
  'moderator.eyebrow': { sr: 'POSEBNA ULOGA', en: 'SPECIAL ROLE' },
  'moderator.heroTitle': {
    sr: 'Posaljite zahtev za pristup moderatorskim opcijama',
    en: 'Send a request for moderator access',
  },
  'moderator.heroBody': {
    sr: 'Ako zelite vecu ulogu u odrzavanju kvaliteta sadrzaja, ovde mozete poslati zahtev koji administracija naknadno proverava i odobrava.',
    en: 'If you want a larger role in maintaining content quality, you can send a request here for the admin team to review and approve.',
  },
  'moderator.currentStatus': { sr: 'Trenutni status', en: 'Current status' },
  'moderator.currentRole': { sr: 'Vasa aktivna uloga: {{role}}', en: 'Your current role: {{role}}' },
  'moderator.whatYouGet': { sr: 'Sta dobijate', en: 'What you get' },
  'moderator.requirements': { sr: 'Uslovi za prijavu', en: 'Requirements' },
  'moderator.sendRequestTitle': { sr: 'Posaljite zahtev', en: 'Send request' },
  'moderator.sendRequestBody': {
    sr: 'Klikom na dugme saljete zahtev timu za proveru. Nakon obrade, pristup ce biti odobren ili odbijen u skladu sa pravilima platforme.',
    en: 'By tapping the button you send a request to the review team. After evaluation, access will be approved or declined according to platform rules.',
  },
  'moderator.submitting': { sr: 'Slanje zahteva...', en: 'Sending request...' },
  'moderator.sendRequest': { sr: 'Posalji zahtev', en: 'Send request' },
  'moderator.requestFailed': { sr: 'Zahtev trenutno nije moguce poslati.', en: 'The request cannot be sent right now.' },
  'moderator.requestSent': { sr: 'Zahtev za pristup moderatoru je uspesno poslat.', en: 'Your moderator access request was sent successfully.' },
  'moderator.role.tourist': { sr: 'Turista', en: 'Tourist' },
  'moderator.role.moderator': { sr: 'Moderator', en: 'Moderator' },
  'moderator.role.admin': { sr: 'Administrator', en: 'Administrator' },
  'moderator.role.manager': { sr: 'Menadzer', en: 'Manager' },
  'moderator.badge.approved': { sr: 'Pristup odobren', en: 'Access approved' },
  'moderator.badge.activeRole': { sr: 'Posebna uloga aktivna', en: 'Special role active' },
  'moderator.badge.available': { sr: 'Zahtev dostupan', en: 'Request available' },
  'moderator.req.1': {
    sr: 'Nalog treba da bude aktivan i uredno koriscen.',
    en: 'Your account should be active and in good standing.',
  },
  'moderator.req.2': {
    sr: 'Pozeljno je da imate iskustva sa prijavama sadrzaja i pravilima zajednice.',
    en: 'Experience with content reports and community guidelines is preferred.',
  },
  'moderator.req.3': {
    sr: 'Nakon prijave, administracija proverava zahtev i status naloga.',
    en: 'After submission, the admin team reviews the request and account status.',
  },
  'moderator.resp.1': {
    sr: 'Pregled prijavljenog sadrzaja i osnovna moderacija objava.',
    en: 'Review reported content and perform basic moderation.',
  },
  'moderator.resp.2': {
    sr: 'Brza komunikacija sa podrskom kada je potrebno reagovati.',
    en: 'Faster communication with support when action is needed.',
  },
  'moderator.resp.3': {
    sr: 'Doprinos kvalitetu i sigurnosti sadrzaja unutar aplikacije.',
    en: 'Contribute to content quality and safety inside the app.',
  },

  'editProfile.title': { sr: 'Izmeni profil', en: 'Edit profile' },
  'editProfile.photoAlt': { sr: 'Profilna fotografija', en: 'Profile photo' },
  'editProfile.changePhoto': { sr: 'Promeni fotografiju', en: 'Change photo' },
  'editProfile.removePhoto': { sr: 'Ukloni fotografiju', en: 'Remove photo' },
  'editProfile.firstName': { sr: 'Ime', en: 'First name' },
  'editProfile.lastName': { sr: 'Prezime', en: 'Last name' },
  'editProfile.country': { sr: 'Drzava', en: 'Country' },
  'editProfile.email': { sr: 'Email adresa', en: 'Email address' },
  'editProfile.phone': { sr: 'Broj telefona', en: 'Phone number' },
  'editProfile.interests': { sr: 'Tvoja interesovanja', en: 'Your interests' },
  'editProfile.selectedCount': { sr: 'Izabrano: {{count}}', en: 'Selected: {{count}}' },
  'editProfile.appLanguage': { sr: 'Jezik aplikacije', en: 'App language' },
  'editProfile.currentLanguage': { sr: 'Trenutno: {{language}}', en: 'Current: {{language}}' },
  'editProfile.saving': { sr: 'Cuvanje...', en: 'Saving...' },
  'editProfile.saveChanges': { sr: 'Sacuvaj promene', en: 'Save changes' },
  'editProfile.cancelChanges': { sr: 'Otkazi izmene', en: 'Cancel changes' },
  'editProfile.refreshFallback': {
    sr: 'Profil nije osvezen sa servera. Prikazani su lokalni podaci.',
    en: 'Profile was not refreshed from the server. Local data is shown.',
  },
  'editProfile.saveFailed': { sr: 'Promene nisu sacuvane.', en: 'Changes were not saved.' },
  'editProfile.saved': { sr: 'Promene su uspesno sacuvane.', en: 'Changes were saved successfully.' },
  'editProfile.photoRemoveFailed': { sr: 'Fotografija nije uklonjena.', en: 'The photo was not removed.' },
  'editProfile.photoRemoved': { sr: 'Fotografija je uklonjena.', en: 'The photo was removed.' },
  'editProfile.photoFormats': { sr: 'Dozvoljeni formati su PNG, JPG i WEBP.', en: 'Allowed formats are PNG, JPG and WEBP.' },
  'editProfile.photoSize': { sr: 'Fotografija ne sme biti veca od 5MB.', en: 'The photo must not be larger than 5MB.' },
  'editProfile.photoSaveFailed': { sr: 'Fotografija nije sacuvana.', en: 'The photo was not saved.' },
  'editProfile.photoSaved': { sr: 'Fotografija je uspesno azurirana.', en: 'The photo was updated successfully.' },
  'editProfile.languageSelected': { sr: 'Izabran je jezik: {{language}}.', en: 'Selected language: {{language}}.' },
  'editProfile.nameError': { sr: 'Ime mora imati najmanje 2 karaktera.', en: 'First name must contain at least 2 characters.' },
  'editProfile.lastNameError': { sr: 'Prezime mora imati najmanje 2 karaktera.', en: 'Last name must contain at least 2 characters.' },
  'editProfile.countryError': { sr: 'Drzava moze imati najvise 40 karaktera.', en: 'Country can have at most 40 characters.' },
  'editProfile.phoneError': { sr: 'Telefon unesi u formatu +382 67 000 000 ili slicno.', en: 'Enter the phone number in a format such as +382 67 000 000.' },
  'editProfile.validationError': { sr: 'Proveri oznacena polja pre cuvanja.', en: 'Check the highlighted fields before saving.' },
  'editProfile.interest.beaches': { sr: 'Plaze', en: 'Beaches' },
  'editProfile.interest.hiking': { sr: 'Planinarenje', en: 'Hiking' },
  'editProfile.interest.history': { sr: 'Istorija', en: 'History' },
  'editProfile.interest.gastronomy': { sr: 'Gastronomija', en: 'Gastronomy' },
  'editProfile.interest.nightlife': { sr: 'Nocni zivot', en: 'Nightlife' },
  'editProfile.interest.culture': { sr: 'Kultura', en: 'Culture' },
  'editProfile.interest.parks': { sr: 'Nacionalni parkovi', en: 'National parks' },

  'support.title': { sr: 'Pomoc i podrska', en: 'Help and support' },
  'support.heroTitle': { sr: 'Pomoc za profil i mobilna podesavanja', en: 'Help for profile and mobile settings' },
  'support.searchAria': { sr: 'Pretraga pitanja', en: 'Search questions' },
  'support.searchPlaceholder': { sr: 'Pretrazi cesto postavljana pitanja...', en: 'Search frequently asked questions...' },
  'support.faqTitle': { sr: 'Cesto postavljana pitanja', en: 'Frequently asked questions' },
  'support.contactTitle': { sr: 'Direktan kontakt', en: 'Direct contact' },
  'support.contactUsers': { sr: 'Podrska korisnicima', en: 'Customer support' },
  'support.contactUsersBody': { sr: 'Pozovi nas za brza pitanja u vezi naloga i aplikacije', en: 'Call us for quick questions about your account and the app' },
  'support.reportProblem': { sr: 'Prijavi problem', en: 'Report an issue' },
  'support.reportProblemBody': { sr: 'Posalji detalje ako neka profile funkcija ne radi kako treba', en: 'Send details if a profile feature is not working as expected' },
  'support.hoursTitle': { sr: 'Radno vreme podrske', en: 'Support hours' },
  'support.weekdays': { sr: 'Ponedeljak - Petak', en: 'Monday - Friday' },
  'support.weekend': { sr: 'Subota - Nedelja', en: 'Saturday - Sunday' },
  'support.chatNote': { sr: '* Prosecno vreme odgovora na chat je manje od 5 minuta.', en: '* Average chat response time is under 5 minutes.' },
  'support.ticketNote': { sr: '* Odgovori na prijave problema stizu u roku od 24h.', en: '* Replies to reported issues arrive within 24 hours.' },
  'support.faq.1.q': { sr: 'Kako da azuriram podatke na profilu?', en: 'How do I update profile information?' },
  'support.faq.1.a': { sr: 'Na ekranu Izmeni profil mozes promeniti ime, prezime, telefon, drzavu i profilnu fotografiju koristeci postojece nalog opcije.', en: 'On the Edit profile screen you can change your first name, last name, phone number, country and profile photo using the existing account options.' },
  'support.faq.2.q': { sr: 'Gde vidim favorite?', en: 'Where can I see my favorites?' },
  'support.faq.2.a': { sr: 'Favorites ekran prikazuje sve stavke sacuvane preko postojeceg API-ja i omogucava brzo uklanjanje onoga sto ti vise ne treba.', en: 'The Favorites screen shows every item saved through the current API and lets you quickly remove anything you no longer need.' },
  'support.faq.3.q': { sr: 'Kako radi planer putovanja?', en: 'How does the trip planner work?' },
  'support.faq.3.a': { sr: 'Planer trenutno radi lokalno na uredjaju i ne trazi backend izmene. Mozes sacuvati destinaciju, datum, beleske i checklistu.', en: 'The planner currently works locally on the device and does not require backend changes. You can save a destination, date, notes and a checklist.' },
  'support.faq.4.q': { sr: 'Kako da promenim jezik aplikacije?', en: 'How do I change the app language?' },
  'support.faq.4.a': { sr: 'Na ekranu Jezik mozes izabrati podrzani jezik i sacuvati promenu preko korisnicke rute. Promena se odmah vidi u mobilnom interfejsu.', en: 'On the Language screen you can choose a supported language and save the change through the user route. The change is reflected immediately in the mobile interface.' },

  'about.supportTitle': { sr: 'Informacije i podrska', en: 'Information and support' },
  'about.version': { sr: 'Verzija 2.4.0', en: 'Version 2.4.0' },
  'about.quote': {
    sr: '"Nasa misija je da svakom putniku pruzimo autenticno iskustvo Crne Gore, od skrivenih plaza na jugu do netaknutih planinskih vrhova na sjeveru."',
    en: '"Our mission is to give every traveler an authentic experience of Montenegro, from hidden southern beaches to untouched mountain peaks in the north."',
  },
  'about.privacy': { sr: 'Politika privatnosti', en: 'Privacy policy' },
  'about.privacyBody': { sr: 'Kako stitimo vase podatke', en: 'How we protect your data' },
  'about.terms': { sr: 'Uslovi koriscenja', en: 'Terms of use' },
  'about.termsBody': { sr: 'Pravila koriscenja aplikacije', en: 'Rules for using the app' },
  'about.contact': { sr: 'Kontaktirajte nas', en: 'Contact us' },
  'about.contactBody': { sr: 'Pitanja, sugestije ili problemi', en: 'Questions, suggestions or issues' },
  'about.footerMade': { sr: 'Napravljeno sa srcem u Crnoj Gori', en: 'Made with heart in Montenegro' },
  'about.footerRights': { sr: 'Sva prava zadrzana.', en: 'All rights reserved.' },

  'privacy.title': { sr: 'Privatnost i podaci', en: 'Privacy and data' },
  'privacy.eyebrow': { sr: 'TRANSPARENTNO', en: 'TRANSPARENT' },
  'privacy.heroTitle': { sr: 'Sta mobilna aplikacija trenutno cuva i prikazuje.', en: 'What the mobile app currently stores and shows.' },
  'privacy.heroBody': { sr: 'Ovaj ekran sluzi kao jasan pregled podataka koje frontend koristi i ogranicenja koja postoje dok backend ne dobije dodatne funkcionalnosti.', en: 'This screen gives a clear overview of the data used by the frontend and the current limitations until the backend gets additional functionality.' },
  'privacy.notesTitle': { sr: 'Bitne napomene', en: 'Important notes' },
  'privacy.section.1.title': { sr: 'Podaci naloga', en: 'Account data' },
  'privacy.section.1.body': { sr: 'Na mobilnom frontendu trenutno prikazujemo osnovne podatke naloga kao sto su ime, prezime, email, telefon, drzava i fotografija profila.', en: 'The mobile frontend currently shows basic account data such as first name, last name, email, phone number, country and profile photo.' },
  'privacy.section.2.title': { sr: 'Lokalno sacuvani podaci', en: 'Locally stored data' },
  'privacy.section.2.body': { sr: 'Planer putovanja i interesovanja mogu biti sacuvani lokalno na uredjaju, bez slanja novih podataka na backend.', en: 'Trip planner data and interests can be stored locally on the device without sending new data to the backend.' },
  'privacy.section.3.title': { sr: 'Kako prijaviti izmenu', en: 'How to request a change' },
  'privacy.section.3.body': { sr: 'Ako zelis ispravku podataka ili dodatna objasnjenja, koristi ekran Pomoc i podrska ili kontakt adresu navedenu u aplikaciji.', en: 'If you want a data correction or additional explanation, use the Help and support screen or the contact address listed in the app.' },
  'privacy.note.1': { sr: 'Frontend deo ne upravlja brisanjem naloga ni eksportom podataka bez backend podrske.', en: 'The frontend does not manage account deletion or data export without backend support.' },
  'privacy.note.2': { sr: 'Profilna fotografija i izmene osnovnih podataka koriste postojece API rute koje su vec dostupne.', en: 'Profile photo updates and basic profile edits use the existing API routes that are already available.' },
  'privacy.note.3': { sr: 'Za osetljive nalog akcije potrebno je dodatno backend resenje i dozvole.', en: 'Sensitive account actions require additional backend support and permissions.' },

  'terms.title': { sr: 'Uslovi koriscenja', en: 'Terms of use' },
  'terms.eyebrow': { sr: 'PREGLED USLOVA', en: 'TERMS OVERVIEW' },
  'terms.heroTitle': { sr: 'Jasan sazetak pravila za mobilni deo aplikacije.', en: 'A clear summary of the rules for the mobile app.' },
  'terms.heroBody': { sr: 'Ovaj ekran daje frontend pregled najvaznijih pravila koriscenja dok se puna pravna verzija ne usaglasi na nivou celog sistema.', en: 'This screen gives a frontend overview of the most important usage rules until the full legal version is aligned across the system.' },
  'terms.notesTitle': { sr: 'Napomene', en: 'Notes' },
  'terms.section.1.title': { sr: 'Koriscenje aplikacije', en: 'Using the app' },
  'terms.section.1.body': { sr: 'Mobilni frontend omogucava pregled destinacija, objekata, favorita i licnih podesavanja. Korisnik je odgovoran za tacnost podataka koje unosi na svom nalogu.', en: 'The mobile frontend lets you browse destinations, objects, favorites and personal settings. The user is responsible for the accuracy of the data entered on the account.' },
  'terms.section.2.title': { sr: 'Sadrzaj i informacije', en: 'Content and information' },
  'terms.section.2.body': { sr: 'Prikazani podaci zavise od dostupnih API odgovora. Frontend prikazuje ono sto backend trenutno vraca i ne garantuje dodatne funkcionalnosti koje nisu podrzane rutama sistema.', en: 'Displayed data depends on available API responses. The frontend shows what the backend currently returns and does not guarantee additional features that are not supported by system routes.' },
  'terms.section.3.title': { sr: 'Nalog i bezbednost', en: 'Account and security' },
  'terms.section.3.body': { sr: 'Odjava, izmena osnovnih podataka i promena fotografije koriste postojece nalog mehanizme. Za dodatne nalog akcije potrebna je posebna backend podrska.', en: 'Logout, basic profile edits and photo changes use existing account mechanisms. Additional account actions require dedicated backend support.' },
  'terms.note.1': { sr: 'Favoriti, recenzije i profilni podaci vezani su za trenutno ulogovan nalog.', en: 'Favorites, reviews and profile data are tied to the currently signed-in account.' },
  'terms.note.2': { sr: 'Lokalno sacuvani planer radi samo na uredjaju na kom je kreiran.', en: 'The locally stored planner works only on the device where it was created.' },
  'terms.note.3': { sr: 'Za pravne i produkcione verzije uslova potrebno je uskladjivanje sa timom i backend specifikacijom.', en: 'Legal and production versions of the terms still need to be aligned with the team and the backend specification.' },

  'map.searchPlaceholder': { sr: 'Pretrazi objekte, rute...', en: 'Search objects, routes...' },
  'map.geoUnsupported': { sr: 'Geolokacija nije podrzana u ovom browseru.', en: 'Geolocation is not supported in this browser.' },
  'map.geoDenied': { sr: 'Dozvolite pristup lokaciji u podesavanjima browsera.', en: 'Please allow location access in your browser settings.' },
  'map.geoUnavailable': { sr: 'Lokacija trenutno nije dostupna.', en: 'Location is currently unavailable.' },
  'map.geoFailed': { sr: 'Nije moguce dobiti vasu lokaciju.', en: 'Unable to get your location.' },

  'event.title': { sr: 'Dogadjaj', en: 'Event' },
  'event.loadingError': { sr: 'Greska pri ucitavanju dogadjaja.', en: 'Failed to load the event.' },
  'event.addedToPlanner': { sr: 'Dogadjaj je dodat u Planner', en: 'The event was added to Planner' },
  'event.free': { sr: 'Besplatno', en: 'Free' },
  'event.buyTicket': { sr: 'Kupi kartu', en: 'Buy ticket' },
  'event.ticketAlert': { sr: 'Kupovina karte - Cena: {{price}}', en: 'Ticket purchase - Price: {{price}}' },
  'event.addToPlanner': { sr: 'Dodaj u Planner', en: 'Add to Planner' },
  'event.about': { sr: 'O dogadjaju', en: 'About the event' },
  'event.descriptionFallback': { sr: 'Opis nije dostupan.', en: 'Description is not available.' },
  'event.availableTickets': { sr: 'Dostupne ulaznice', en: 'Available tickets' },
  'event.standardTicket': { sr: 'Standardna ulaznica', en: 'Standard ticket' },
  'event.select': { sr: 'Odaberi', en: 'Select' },

  'object.titleFallback': { sr: 'Objekat', en: 'Object' },
  'object.loadingError': { sr: 'Greska pri ucitavanju objekta.', en: 'Failed to load the object.' },
  'object.about': { sr: 'O {{name}}', en: 'About {{name}}' },
  'object.amenitiesSoon': { sr: 'Sadrzaji ce biti dostupni uskoro.', en: 'Amenities will be available soon.' },
  'object.writeReviewSoon': { sr: 'Forma za novu recenziju je jos u izradi.', en: 'The new review form is still being built.' },
  'object.workingHoursMissing': { sr: 'Radno vreme nije navedeno', en: 'Working hours are not available' },
  'object.nearbyNone': { sr: 'Nema drugih {{name}}a u istoj lokaciji.', en: 'There are no other nearby {{name}} items in the same location.' },
  'object.allReviews': { sr: 'Sve recenzije', en: 'All reviews' },
  'object.totalReviews': { sr: '{{count}} recenzija', en: '{{count}} reviews' },

  'restaurant.title': { sr: 'Restoran', en: 'Restaurant' },
  'restaurant.loadingError': { sr: 'Greska pri ucitavanju restorana.', en: 'Failed to load the restaurant.' },
  'restaurant.about': { sr: 'O restoranu', en: 'About the restaurant' },
  'restaurant.writeReviewSoon': { sr: 'Forma za novu recenziju je jos u izradi.', en: 'The new review form is still being built.' },

  'hotel.loadingError': { sr: 'Greska pri ucitavanju hotela.', en: 'Failed to load the hotel.' },
  'hotel.bookingSoon': { sr: 'Booking sistem ce biti integrisan kasnije.', en: 'The booking flow will be integrated later.' },
  'hotel.addedToPlanner': { sr: 'Hotel je dodat u Planner', en: 'The hotel was added to Planner' },
  'hotel.phoneMissing': { sr: 'Broj telefona nije dostupan', en: 'Phone number is not available' },
  'hotel.galleryEmpty': { sr: 'Nema dostupnih slika', en: 'No images available' },
  'hotel.reviewTitle': { sr: 'Recenzije', en: 'Reviews' },
  'hotel.showLess': { sr: 'Prikazi manje >', en: 'Show Less >' },
  'hotel.reviewAria': { sr: 'Ocena recenzije', en: 'Review rating' },
  'hotel.responseLabel': { sr: 'Odgovor hotela', en: 'Hotel response' },
  'hotel.reviewsPending': { sr: 'Recenzije ce biti prikazane kada stignu sa backenda.', en: 'Reviews will appear once they arrive from the backend.' },
  'hotel.nearbyTitle': { sr: 'Obliznji hoteli', en: 'Nearby hotels' },
  'hotel.nearbyEmpty': { sr: 'Nema drugih hotela u istoj lokaciji.', en: 'There are no other hotels in the same location.' },
  'hotel.visitWebsite': { sr: 'Poseti sajt', en: 'Visit website' },
  'hotel.aboutTitle': { sr: 'O hotelu', en: 'About' },
  'hotel.aboutFallback': { sr: 'Detaljnije informacije o ovom hotelu bice prikazane ovde.', en: 'Detailed information about this hotel will be displayed here.' },
  'hotel.locationMontenegro': { sr: 'Crna Gora', en: 'Montenegro' },

  'time.today': { sr: 'DANAS', en: 'TODAY' },
  'time.dayAgo': { sr: 'PRE 1 DAN', en: '1 DAY AGO' },
  'time.daysAgo': { sr: 'PRE {{count}} DANA', en: '{{count}} DAYS AGO' },
  'time.weekAgo': { sr: 'PRE 1 NEDELJU', en: '1 WEEK AGO' },
  'time.weeksAgo': { sr: 'PRE {{count}} NEDELJE', en: '{{count}} WEEKS AGO' },
  'time.monthAgo': { sr: 'PRE 1 MESEC', en: '1 MONTH AGO' },
  'time.monthsAgo': { sr: 'PRE {{count}} MESECI', en: '{{count}} MONTHS AGO' },
  'time.yearAgo': { sr: 'PRE 1 GODINU', en: '1 YEAR AGO' },
  'time.yearsAgo': { sr: 'PRE {{count}} GODINA', en: '{{count}} YEARS AGO' },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly storageKey = 'spirego-language';
  private readonly activeLanguage = signal<AppLanguage>(this.readStoredLanguage());

  constructor() {
    effect(() => {
      const language = this.activeLanguage();

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, language);
      }

      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
      }
    });
  }

  language(): AppLanguage {
    return this.activeLanguage();
  }

  currentLocale(): string {
    switch (this.activeLanguage()) {
      case 'en':
        return 'en-US';
      case 'es':
        return 'es-ES';
      case 'it':
        return 'it-IT';
      case 'me':
        return 'sr-Latn-ME';
      case 'sr':
      default:
        return 'sr-Latn-RS';
    }
  }

  setLanguage(language?: string | null): AppLanguage {
    const normalized = this.normalizeLanguage(language);
    this.activeLanguage.set(normalized);
    return normalized;
  }

  normalizeLanguageCode(language?: string | null): AppLanguage {
    return this.normalizeLanguage(language);
  }

  labelKeyForLanguage(language?: string | null): string {
    return LANGUAGE_LABEL_KEYS[this.normalizeLanguage(language)];
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const language = this.resolveTranslationLocale(this.activeLanguage());
    const template = TRANSLATIONS[key]?.[language] ?? TRANSLATIONS[key]?.sr ?? key;

    if (!params) {
      return template;
    }

    return Object.entries(params).reduce((value, [param, replacement]) => {
      return value.replaceAll(`{{${param}}}`, String(replacement));
    }, template);
  }

  private readStoredLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') {
      return 'sr';
    }

    return this.normalizeLanguage(localStorage.getItem(this.storageKey));
  }

  private normalizeLanguage(language?: string | null): AppLanguage {
    switch (language?.trim().toLowerCase()) {
      case 'me':
      case 'cnr':
        return 'me';
      case 'en':
        return 'en';
      case 'es':
        return 'es';
      case 'it':
        return 'it';
      case 'el':
      case 'gr':
        return 'sr';
      case 'sr':
      default:
        return 'sr';
    }
  }

  private resolveTranslationLocale(language: AppLanguage): TranslationLocale {
    return language === 'me' || language === 'sr' ? 'sr' : 'en';
  }
}
