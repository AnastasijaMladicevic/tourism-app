import { Injectable, effect, signal } from '@angular/core';

export type AppLanguage = 'me' | 'sr' | 'en' | 'de' | 'fr' | 'es' | 'it';
type TranslationLocale = 'me' | 'sr' | 'en' | 'de' | 'fr' | 'es' | 'it';
type TranslationEntry = Partial<Record<TranslationLocale, string>>;

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  me: 'language.montenegrin',
  sr: 'language.serbian',
  en: 'language.english',
  de: 'language.german',
  fr: 'language.french',
  es: 'language.spanish',
  it: 'language.italian',
};

const TRANSLATIONS: Record<string, TranslationEntry> = {
  'common.back': { sr: 'Nazad', en: 'Back', es: 'Atrás' },
  'common.loading': { sr: 'Ucitavanje...', en: 'Loading...', es: 'Cargando...' },
  'common.save': { sr: 'Sacuvaj', en: 'Save', es: 'Guardar' },
  'common.cancel': { sr: 'Otkazi', en: 'Cancel', es: 'Cancelar' },
  'common.remove': { sr: 'Ukloni', en: 'Remove', es: 'Eliminar' },
  'common.close': { sr: 'Zatvori', en: 'Close', es: 'Cerrar' },
  'common.details': { sr: 'Detalji', en: 'Details', es: 'Detalles' },
  'common.retry': { sr: 'Pokusaj ponovo', en: 'Try again', es: 'Intentar de nuevo' },
  'common.notAvailable': { sr: 'Nije dostupno', en: 'Not available', es: 'No disponible' },
  'common.dateNotAvailable': { sr: 'Datum nije dostupan', en: 'Date not available', es: 'Fecha no disponible' },
  'common.emailNotAvailable': { sr: 'Email nije dostupan', en: 'Email not available', es: 'Correo electrónico no disponible' },
  'common.savedOn': { sr: 'Sacuvano', en: 'Saved', es: 'Guardado' },
  'common.publishedOn': { sr: 'Objavljeno', en: 'Published', es: 'Publicado' },
  'common.openNow': { sr: 'OTVORENO', en: 'OPEN NOW', es: 'ABIERTO' },
  'common.closed': { sr: 'ZATVORENO', en: 'CLOSED', es: 'CERRADO' },
  'common.new': { sr: 'Novo', en: 'New', es: 'Nuevo' },
  'common.reviews': { sr: 'recenzije', en: 'reviews', es: 'reseñas' },
  'common.reviewsTitle': { sr: 'Recenzije', en: 'Reviews', es: 'Reseñas' },
  'common.seeAll': { sr: 'Prikazi sve >', en: 'See All >', es: 'Ver todo >' },
  'common.viewAll': { sr: 'Vidi sve >', en: 'View All >', es: 'Ver todo >' },
  'common.gallery': { sr: 'Galerija', en: 'Gallery', es: 'Galería' },
  'common.location': { sr: 'Lokacija', en: 'Location', es: 'Ubicación' },
  'common.viewOnMap': { sr: 'Pogledaj na mapi', en: 'View on Map', es: 'Ver en el mapa' },
  'common.bookNow': { sr: 'Rezervisi odmah', en: 'Book Now', es: 'Reservar ahora' },
  'common.addReview': { sr: 'Dodaj recenziju', en: 'Add review', es: 'Añadir reseña' },
  'common.contactInfo': { sr: 'Kontakt informacije', en: 'Contact info', es: 'Información de contacto' },
  'common.price': { sr: 'Cena', en: 'Price', es: 'Precio' },
  'common.startingFrom': { sr: 'Od', en: 'Starting from', es: 'Desde' },
  'common.about': { sr: 'O nama', en: 'About', es: 'Acerca de' },
  'common.welcomeBack': { sr: 'Dobro dosao nazad', en: 'Welcome back', de: 'Willkommen zurück', fr: 'Bon retour', it: 'Bentornato', es: 'Bienvenido de nuevo', me: 'Dobro došao nazad' },
  'common.score': { sr: 'rezultat', en: 'score', de: 'Punktzahl', fr: 'score', it: 'punteggio', es: 'puntuación', me: 'rezultat' },
  'common.contentItems': { sr: 'stavki sadrzaja', en: 'content items', de: 'Inhaltsobjekte', fr: 'éléments de contenu', it: 'elementi di contenuto', es: 'elementos de contenido', me: 'stavki sadržaja' },
  'common.objects': { sr: 'Objekti', en: 'Objects', de: 'Objekte', fr: 'Objets', it: 'Oggetti', es: 'Objetos', me: 'Objekti' },
  'common.events': { sr: 'Dogadjaji', en: 'Events', de: 'Veranstaltungen', fr: 'Événements', it: 'Eventi', es: 'Eventos', me: 'Događaji' },
  'common.activities': { sr: 'Aktivnosti', en: 'Activities', de: 'Aktivitäten', fr: 'Activités', it: 'Attività', es: 'Actividades', me: 'Aktivnosti' },

  'nav.home': { sr: 'Pocetna', en: 'Home', es: 'Inicio' },
  'nav.map': { sr: 'Mapa', en: 'Map', es: 'Mapa' },
  'nav.favorites': { sr: 'Favoriti', en: 'Favorites', es: 'Favoritos' },
  'nav.planner': { sr: 'Planer', en: 'Planner', es: 'Planificador' },
  'nav.profile': { sr: 'Profil', en: 'Profile', es: 'Perfil' },
  'layout.openMenu': { sr: 'Otvori meni', en: 'Open menu', es: 'Abrir menú' },
  'layout.closeMenu': { sr: 'Zatvori meni', en: 'Close menu', es: 'Cerrar menú' },
  'layout.settings': { sr: 'Podesavanja', en: 'Settings', es: 'Ajustes' },
  'layout.mainMenu': { sr: 'Glavni meni', en: 'Main Menu', es: 'Menú principal' },
  'layout.system': { sr: 'Sistem', en: 'System', es: 'Sistema' },
  'layout.moderation': { sr: 'Moderacija', en: 'Moderation', es: 'Moderación' },
  'layout.dashboard': { sr: 'Kontrolna tabla', en: 'Dashboard', es: 'Panel' },
  'layout.destinations': { sr: 'Destinacije', en: 'Destinations', es: 'Destinos' },
  'layout.usersRoles': { sr: 'Korisnici i uloge', en: 'Users & Roles', es: 'Usuarios y roles' },
  'layout.mapView': { sr: 'Prikaz mape', en: 'Map View', es: 'Vista del mapa' },
  'layout.activityLog': { sr: 'Evidencija aktivnosti', en: 'Activity Log', es: 'Registro de actividad' },
  'layout.objects': { sr: 'Objekti', en: 'Objects', es: 'Objetos' },
  'layout.activities': { sr: 'Aktivnosti', en: 'Activities', es: 'Actividades' },
  'layout.events': { sr: 'Dogadjaji', en: 'Events', es: 'Eventos' },
  'layout.reviews': { sr: 'Recenzije', en: 'Reviews', es: 'Reseñas' },
  'layout.reviewsReplies': { sr: 'Recenzije i odgovori', en: 'Reviews & Replies', es: 'Reseñas y respuestas' },
  'layout.creatorReports': { sr: 'Izvestaji kreatora', en: 'Creator Reports', es: 'Informes del creador' },
  'layout.localities': { sr: 'Lokaliteti', en: 'Localities', es: 'Localidades' },
  'layout.signOut': { sr: 'Odjavi se', en: 'Sign Out', es: 'Cerrar sesión' },
  'layout.profile': { sr: 'Profil', en: 'Profile', es: 'Perfil' },
  'layout.notifications': { sr: 'Obavestenja', en: 'Notifications', es: 'Notificaciones' },
  'layout.unread': { sr: 'neprocitano', en: 'unread', es: 'no leídas' },
  'layout.markAllRead': { sr: 'Oznaci sve kao procitano', en: 'Mark all read', es: 'Marcar todo como leído' },
  'layout.allCaughtUp': { sr: 'Sve je pregledano', en: 'All caught up', es: 'Todo revisado' },
  'layout.noNotifications': { sr: 'Jos nema obavestenja.', en: 'No notifications yet.', es: 'Aún no hay notificaciones.' },
  'layout.loadingNotifications': { sr: 'Ucitavanje obavestenja…', en: 'Loading notifications…', es: 'Cargando notificaciones…' },
  'layout.justNow': { sr: 'Upravo sada', en: 'Just now', es: 'Justo ahora' },
  'layout.minutesAgo': { sr: 'pre {{count}}m', en: '{{count}}m ago', es: 'hace {{count}} min' },
  'layout.hoursAgo': { sr: 'pre {{count}}h', en: '{{count}}h ago', es: 'hace {{count}} h' },
  'layout.daysAgo': { sr: 'pre {{count}}d', en: '{{count}}d ago', es: 'hace {{count}} d' },

  'profile.title': { sr: 'Profil', en: 'Profile', es: 'Perfil' },
  'profile.edit': { sr: 'Uredi', en: 'Edit', es: 'Editar' },
  'profile.activeAccount': { sr: 'Aktivan nalog', en: 'Active account', es: 'Cuenta activa' },
  'profile.defaultUser': { sr: 'SpireGO korisnik', en: 'SpireGO user', es: 'Usuario de SpireGO' },
  'profile.stats.favorites': { sr: 'FAVORITI', en: 'FAVORITES', es: 'FAVORITOS' },
  'profile.stats.reviews': { sr: 'RECENZIJE', en: 'REVIEWS', es: 'RESEÑAS' },
  'profile.section.trips': { sr: 'MOJA PUTOVANJA', en: 'MY TRIPS', es: 'MIS VIAJES' },
  'profile.section.settings': { sr: 'PODESAVANJA', en: 'SETTINGS', es: 'AJUSTES' },
  'profile.section.account': { sr: 'NALOG', en: 'ACCOUNT', es: 'CUENTA' },
  'profile.favorites': { sr: 'Favoriti', en: 'Favorites', es: 'Favoritos' },
  'profile.myReviews': { sr: 'Moje recenzije', en: 'My reviews', es: 'Mis reseñas' },
  'profile.language': { sr: 'Jezik', en: 'Language', es: 'Idioma' },
  'profile.region': { sr: 'Region', en: 'Region', es: 'Región' },
  'profile.support': { sr: 'Pomoc i podrska', en: 'Help and support', es: 'Ayuda y soporte' },
  'profile.privacy': { sr: 'Privatnost i podaci', en: 'Privacy and data', es: 'Privacidad y datos' },
  'profile.terms': { sr: 'Uslovi koriscenja', en: 'Terms of use', es: 'Términos de uso' },
  'profile.moderator': { sr: 'Zatrazi dozvolu za moderatora', en: 'Request moderator access', es: 'Solicitar acceso de moderador' },
  'profile.about': { sr: 'O nama', en: 'About us', es: 'Acerca de nosotros' },
  'profile.logout': { sr: 'Odjavi se', en: 'Log out', es: 'Cerrar sesión' },

  'region.title': { sr: 'Region', en: 'Region', es: 'Región' },
  'region.available': { sr: 'Dostupni regioni', en: 'Available regions', es: 'Regiones disponibles' },
  'region.infoTitle': { sr: 'Promena regiona se primenjuje odmah', en: 'Region changes apply instantly', es: 'Los cambios de región se aplican al instante' },
  'region.infoBody': {
    sr: 'Nakon cuvanja, kompletan mobilni interfejs ce odmah biti prikazan na izabranom regionu.',
    en: 'After saving, the entire mobile interface will switch to the selected region immediately.',
    es: 'Después de guardar, toda la interfaz móvil cambiará de inmediato a la región seleccionada.',
  },
  'region.montenegro': { sr: 'Crna Gora', en: 'Montenegro', es: 'Montenegro' },
  'region.spain': { sr: 'Španija', en: 'Spain', es: 'España' },
  'region.defaultBadge': { sr: 'Podrazumevano', en: 'Default', es: 'Predeterminado' },
  'region.active': { sr: 'Region je vec aktivan.', en: 'This region is already active.', es: 'Esta región ya está activa.' },
  'region.saved': { sr: 'Region je uspesno azuriran.', en: 'Region was updated successfully.', es: 'La región se actualizó correctamente.' },
  'region.saveFailed': { sr: 'Promena regiona nije sacuvana.', en: 'Region change was not saved.', es: 'El cambio de región no se guardó.' },
  'region.loadFailed': { sr: 'Regioni trenutno nisu dostupni.', en: 'Regions are currently unavailable.', es: 'Las regiones no están disponibles por ahora.' },
  'region.noneAvailable': { sr: 'Nema dostupnih regiona.', en: 'No regions are available.', es: 'No hay regiones disponibles.' },
  'language.title': { sr: 'Jezik', en: 'Language', es: 'Idioma' },
  'language.available': { sr: 'Dostupni jezici', en: 'Available languages', es: 'Idiomas disponibles' },
  'language.infoTitle': {
    sr: 'Promena jezika se primenjuje odmah',
    en: 'Language changes apply instantly',
    es: 'Los cambios de idioma se aplican al instante',
  },
  'language.infoBody': {
    sr: 'Nakon cuvanja, mobilni interfejs ce odmah biti prikazan na izabranom jeziku.',
    en: 'After saving, the mobile interface will immediately switch to the selected language.',
    es: 'Después de guardar, la interfaz móvil cambiará de inmediato al idioma seleccionado.',
  },
  'language.active': { sr: 'Jezik je vec aktivan.', en: 'This language is already active.', es: 'Este idioma ya está activo.' },
  'language.saveFailed': { sr: 'Promena jezika nije sacuvana.', en: 'Language change was not saved.', es: 'El cambio de idioma no se guardó.' },
  'language.saved': { sr: 'Jezik je uspesno azuriran.', en: 'Language was updated successfully.', es: 'El idioma se actualizó correctamente.' },
  'language.saving': { sr: 'Cuvanje...', en: 'Saving...', es: 'Guardando...' },
  'language.apply': { sr: 'Primeni jezik', en: 'Apply language', es: 'Aplicar idioma' },
  'language.confirm': {
    sr: 'Klikom na dugme potvrdujete promenu jezika aplikacije na {{language}}.',
    en: 'By tapping the button you confirm switching the app language to {{language}}.',
    es: 'Al pulsar el botón confirmas el cambio del idioma de la aplicación a {{language}}.',
  },
  'region.apply': { sr: 'Primeni region', en: 'Apply region', es: 'Aplicar región' },
  'region.confirm': {
    sr: 'Klikom na dugme potvrdujete promenu regiona aplikacije na {{language}}.',
    en: 'By tapping the button you confirm switching the app region to {{language}}.',
    es: 'Al pulsar el botón confirmas el cambio de la región de la aplicación a {{language}}.',
  },
  'language.montenegrin': { sr: 'Crnogorski', en: 'Montenegrin', es: 'Montenegrino' },
  'language.serbian': { sr: 'Srpski', en: 'Serbian', es: 'Serbio' },
  'language.english': { sr: 'English', en: 'English', es: 'Inglés' },
  'language.german': { sr: 'Nemacki', en: 'German', es: 'Alemán' },
  'language.french': { sr: 'Francuski', en: 'French', es: 'Francés' },
  'language.spanish': { sr: 'Španski', en: 'Spanish', es: 'Español' },
  'language.italian': { sr: 'Italijanski', en: 'Italian', es: 'Italiano' },

  'favorites.heroEyebrow': { sr: 'FAVORITI', en: 'FAVORITES', es: 'FAVORITOS' },
  'favorites.heroTitle': {
    sr: 'Tvoje omiljene stavke su na jednom mestu.',
    en: 'All of your favorite objects are in one place.',
    es: 'Todos tus elementos favoritos están en un solo lugar.',
  },
  'favorites.heroBody': {
    sr: 'Pregledaj sve sto si dodao u favorite i brzo ukloni stavke koje vise ne zelis da cuvas.',
    en: 'Browse everything you added to favorites and quickly remove items you no longer want to keep.',
    es: 'Revisa todo lo que añadiste a favoritos y elimina rápidamente lo que ya no quieras conservar.',
  },
  'favorites.loadError': {
    sr: 'Favoriti trenutno nisu dostupni.',
    en: 'Favorites are currently unavailable.',
    es: 'Los favoritos no están disponibles por ahora.',
  },
  'favorites.removeError': {
    sr: 'Favorit nije uklonjen. Pokusaj ponovo.',
    en: 'The favorite item could not be removed. Please try again.',
    es: 'No se pudo eliminar el favorito. Inténtalo de nuevo.',
  },
  'favorites.loadingBody': { sr: 'Pripremamo tvoje favorite.', en: 'We are preparing your favorites.', es: 'Estamos preparando tus favoritos.' },
  'favorites.emptyTitle': { sr: 'Jos nemas favorita', en: 'You do not have any favorites yet', es: 'Todavía no tienes favoritos' },
  'favorites.emptyBody': {
    sr: 'Kada dodas destinaciju ili objekat u favorite, ovde ce se pojaviti.',
    en: 'When you add a destination or object to favorites, it will appear here.',
    es: 'Cuando añadas un destino u objeto a favoritos, aparecerá aquí.',
  },
  'favorites.removing': { sr: 'Uklanjanje...', en: 'Removing...', es: 'Eliminando...' },
  'favorites.type.default': { sr: 'Favorit', en: 'Favorite', es: 'Favorito' },
  'favorites.type.destination': { sr: 'Destinacija', en: 'Destination', es: 'Destino' },
  'favorites.type.object': { sr: 'Objekat', en: 'Object', es: 'Objeto' },
  'favorites.type.activity': { sr: 'Aktivnost', en: 'Activity', es: 'Actividad' },
  'favorites.type.route': { sr: 'Ruta', en: 'Route', es: 'Ruta' },
  'favorites.type.locality': { sr: 'Mesto', en: 'Place', es: 'Lugar' },
  'favorites.fallbackTitle': { sr: 'Favorit #{{id}}', en: 'Favorite #{{id}}', es: 'Favorito #{{id}}' },

  'reviews.title': { sr: 'Moje recenzije', en: 'My reviews', es: 'Mis reseñas' },
  'reviews.heroEyebrow': { sr: 'TVOJ UTISAK', en: 'YOUR FEEDBACK', es: 'TU OPINIÓN' },
  'reviews.heroTitle': {
    sr: 'Sve recenzije koje si ostavio nalaze se ovde.',
    en: 'All reviews you have left are shown here.',
    es: 'Todas las reseñas que has dejado se muestran aquí.',
  },
  'reviews.heroBody': {
    sr: 'Pregledaj sta si ocenio, kada je komentar ostavljen i da li postoji odgovor.',
    en: 'Review what you rated, when the comment was left, and whether there is a response.',
    es: 'Revisa qué calificaste, cuándo dejaste el comentario y si existe una respuesta.',
  },
  'reviews.loadError': { sr: 'Tvoje recenzije trenutno nisu dostupne.', en: 'Your reviews are currently unavailable.', es: 'Tus reseñas no están disponibles por ahora.' },
  'reviews.loadingBody': { sr: 'Pripremamo tvoje recenzije.', en: 'We are preparing your reviews.', es: 'Estamos preparando tus reseñas.' },
  'reviews.emptyTitle': { sr: 'Jos nemas recenzija', en: 'You do not have any reviews yet', es: 'Todavía no tienes reseñas' },
  'reviews.emptyBody': {
    sr: 'Kada ostavis komentar na objekat ili destinaciju, ovde ces ga videti.',
    en: 'When you leave a comment on an object or destination, it will appear here.',
    es: 'Cuando dejes un comentario en un objeto o destino, aparecerá aquí.',
  },
  'reviews.objectFallback': { sr: 'Objekat bez naziva', en: 'Unnamed place', es: 'Lugar sin nombre' },
  'reviews.textFallback': { sr: 'Recenzija nema dodatni komentar.', en: 'This review has no additional comment.', es: 'Esta reseña no tiene un comentario adicional.' },
  'reviews.statusFallback': { sr: 'Bez statusa', en: 'No status', es: 'Sin estado' },
  'reviews.ratingAria': { sr: 'Ocena {{rating}}', en: 'Rating {{rating}}', es: 'Calificación {{rating}}' },
  'reviews.creatorResponse': { sr: 'Odgovor kreatora', en: 'Creator response', es: 'Respuesta del creador' },

  'moderator.title': { sr: 'Pristup moderatoru', en: 'Moderator access', es: 'Acceso de moderador' },
  'moderator.eyebrow': { sr: 'POSEBNA ULOGA', en: 'SPECIAL ROLE', es: 'ROL ESPECIAL' },
  'moderator.heroTitle': {
    sr: 'Posaljite zahtev za pristup moderatorskim opcijama',
    en: 'Send a request for moderator access',
    es: 'Envía una solicitud para acceder a las opciones de moderador',
  },
  'moderator.heroBody': {
    sr: 'Ako zelite vecu ulogu u odrzavanju kvaliteta sadrzaja, ovde mozete poslati zahtev koji administracija naknadno proverava i odobrava.',
    en: 'If you want a larger role in maintaining content quality, you can send a request here for the admin team to review and approve.',
    es: 'Si quieres un rol mayor en el mantenimiento de la calidad del contenido, aquí puedes enviar una solicitud para que el equipo de administración la revise y apruebe.',
  },
  'moderator.currentStatus': { sr: 'Trenutni status', en: 'Current status', es: 'Estado actual' },
  'moderator.currentRole': { sr: 'Vasa aktivna uloga: {{role}}', en: 'Your current role: {{role}}', es: 'Tu rol actual: {{role}}' },
  'moderator.whatYouGet': { sr: 'Sta dobijate', en: 'What you get', es: 'Qué obtienes' },
  'moderator.requirements': { sr: 'Uslovi za prijavu', en: 'Requirements', es: 'Requisitos' },
  'moderator.sendRequestTitle': { sr: 'Posaljite zahtev', en: 'Send request', es: 'Enviar solicitud' },
  'moderator.sendRequestBody': {
    sr: 'Klikom na dugme saljete zahtev timu za proveru. Nakon obrade, pristup ce biti odobren ili odbijen u skladu sa pravilima platforme.',
    en: 'By tapping the button you send a request to the review team. After evaluation, access will be approved or declined according to platform rules.',
    es: 'Al pulsar el botón envías una solicitud al equipo de revisión. Tras evaluarla, el acceso se aprobará o rechazará según las reglas de la plataforma.',
  },
  'moderator.submitting': { sr: 'Slanje zahteva...', en: 'Sending request...', es: 'Enviando solicitud...' },
  'moderator.sendRequest': { sr: 'Posalji zahtev', en: 'Send request', es: 'Enviar solicitud' },
  'moderator.requestFailed': { sr: 'Zahtev trenutno nije moguce poslati.', en: 'The request cannot be sent right now.', es: 'No se puede enviar la solicitud ahora mismo.' },
  'moderator.requestSent': { sr: 'Zahtev za pristup moderatoru je uspesno poslat.', en: 'Your moderator access request was sent successfully.', es: 'Tu solicitud de acceso de moderador se envió correctamente.' },
  'moderator.role.tourist': { sr: 'Turista', en: 'Tourist', es: 'Turista' },
  'moderator.role.moderator': { sr: 'Moderator', en: 'Moderator', es: 'Moderador' },
  'moderator.role.admin': { sr: 'Administrator', en: 'Administrator', es: 'Administrador' },
  'moderator.role.manager': { sr: 'Menadzer', en: 'Manager', es: 'Gerente' },
  'moderator.badge.approved': { sr: 'Pristup odobren', en: 'Access approved', es: 'Acceso aprobado' },
  'moderator.badge.activeRole': { sr: 'Posebna uloga aktivna', en: 'Special role active', es: 'Rol especial activa' },
  'moderator.badge.available': { sr: 'Zahtev dostupan', en: 'Request available', es: 'Solicitud disponible' },
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

  'editProfile.title': { sr: 'Izmeni profil', en: 'Edit profile', es: 'Editar perfil' },
  'editProfile.photoAlt': { sr: 'Profilna fotografija', en: 'Profile photo', es: 'Foto de perfil' },
  'editProfile.changePhoto': { sr: 'Promeni fotografiju', en: 'Change photo', es: 'Cambiar foto' },
  'editProfile.removePhoto': { sr: 'Ukloni fotografiju', en: 'Remove photo', es: 'Eliminar foto' },
  'editProfile.firstName': { sr: 'Ime', en: 'First name', es: 'Nombre' },
  'editProfile.lastName': { sr: 'Prezime', en: 'Last name', es: 'Apellido' },
  'editProfile.country': { sr: 'Drzava', en: 'Country', es: 'País' },
  'editProfile.email': { sr: 'Email adresa', en: 'Email address', es: 'Correo electrónico' },
  'editProfile.phone': { sr: 'Broj telefona', en: 'Phone number', es: 'Número de teléfono' },
  'editProfile.interests': { sr: 'Tvoja interesovanja', en: 'Your interests', es: 'Tus intereses' },
  'editProfile.selectedCount': { sr: 'Izabrano: {{count}}', en: 'Selected: {{count}}', es: 'Seleccionado: {{count}}' },
  'editProfile.appLanguage': { sr: 'Jezik aplikacije', en: 'App language', es: 'Idioma de la app' },
  'editProfile.currentLanguage': { sr: 'Trenutno: {{language}}', en: 'Current: {{language}}', es: 'Actual: {{language}}' },
  'editProfile.saving': { sr: 'Cuvanje...', en: 'Saving...', es: 'Guardando...' },
  'editProfile.saveChanges': { sr: 'Sacuvaj promene', en: 'Save changes', es: 'Guardar cambios' },
  'editProfile.cancelChanges': { sr: 'Otkazi izmene', en: 'Cancel changes', es: 'Cancelar cambios' },
  'editProfile.refreshFallback': {
    sr: 'Profil nije osvezen sa servera. Prikazani su lokalni podaci.',
    en: 'Profile was not refreshed from the server. Local data is shown.',
    es: 'El perfil no se actualizó desde el servidor. Se muestran datos locales.',
  },
  'editProfile.saveFailed': { sr: 'Promene nisu sacuvane.', en: 'Changes were not saved.', es: 'Los cambios no se guardaron.' },
  'editProfile.saved': { sr: 'Promene su uspesno sacuvane.', en: 'Changes were saved successfully.', es: 'Los cambios se guardaron correctamente.' },
  'editProfile.photoRemoveFailed': { sr: 'Fotografija nije uklonjena.', en: 'The photo was not removed.', es: 'La foto no se eliminó.' },
  'editProfile.photoRemoved': { sr: 'Fotografija je uklonjena.', en: 'The photo was removed.', es: 'La foto se eliminó.' },
  'editProfile.photoFormats': { sr: 'Dozvoljeni formati su PNG, JPG i WEBP.', en: 'Allowed formats are PNG, JPG and WEBP.', es: 'Los formatos permitidos son PNG, JPG y WEBP.' },
  'editProfile.photoSize': { sr: 'Fotografija ne sme biti veca od 5MB.', en: 'The photo must not be larger than 5MB.', es: 'La foto no puede superar los 5 MB.' },
  'editProfile.photoSaveFailed': { sr: 'Fotografija nije sacuvana.', en: 'The photo was not saved.', es: 'La foto no se guardó.' },
  'editProfile.photoSaved': { sr: 'Fotografija je uspesno azurirana.', en: 'The photo was updated successfully.', es: 'La foto se actualizó correctamente.' },
  'editProfile.languageSelected': { sr: 'Izabran je jezik: {{language}}.', en: 'Selected language: {{language}}.', es: 'Idioma seleccionado: {{language}}.' },
  'editProfile.nameError': { sr: 'Ime mora imati najmanje 2 karaktera.', en: 'First name must contain at least 2 characters.', es: 'El nombre debe tener al menos 2 caracteres.' },
  'editProfile.lastNameError': { sr: 'Prezime mora imati najmanje 2 karaktera.', en: 'Last name must contain at least 2 characters.', es: 'El apellido debe tener al menos 2 caracteres.' },
  'editProfile.countryError': { sr: 'Drzava moze imati najvise 40 karaktera.', en: 'Country can have at most 40 characters.', es: 'El país puede tener como máximo 40 caracteres.' },
  'editProfile.phoneError': { sr: 'Telefon unesi u formatu +382 67 000 000 ili slicno.', en: 'Enter the phone number in a format such as +382 67 000 000.', es: 'Introduce el teléfono en un formato como +382 67 000 000.' },
  'editProfile.validationError': { sr: 'Proveri oznacena polja pre cuvanja.', en: 'Check the highlighted fields before saving.', es: 'Revisa los campos marcados antes de guardar.' },
  'editProfile.interest.beaches': { sr: 'Plaze', en: 'Beaches', es: 'Playas' },
  'editProfile.interest.hiking': { sr: 'Planinarenje', en: 'Hiking', es: 'Senderismo' },
  'editProfile.interest.history': { sr: 'Istorija', en: 'History', es: 'Historia' },
  'editProfile.interest.gastronomy': { sr: 'Gastronomija', en: 'Gastronomy', es: 'Gastronomía' },
  'editProfile.interest.nightlife': { sr: 'Nocni zivot', en: 'Nightlife', es: 'Vida nocturna' },
  'editProfile.interest.culture': { sr: 'Kultura', en: 'Culture', es: 'Cultura' },
  'editProfile.interest.parks': { sr: 'Nacionalni parkovi', en: 'National parks', es: 'Parques nacionales' },

  'support.title': { sr: 'Pomoc i podrska', en: 'Help and support', es: 'Ayuda y soporte' },
  'support.heroTitle': { sr: 'Pomoc za profil i mobilna podesavanja', en: 'Help for profile and mobile settings', es: 'Ayuda para el perfil y los ajustes móviles' },
  'support.searchAria': { sr: 'Pretraga pitanja', en: 'Search questions', es: 'Buscar preguntas' },
  'support.searchPlaceholder': { sr: 'Pretrazi cesto postavljana pitanja...', en: 'Search frequently asked questions...', es: 'Busca preguntas frecuentes...' },
  'support.faqTitle': { sr: 'Cesto postavljana pitanja', en: 'Frequently asked questions', es: 'Preguntas frecuentes' },
  'support.contactTitle': { sr: 'Direktan kontakt', en: 'Direct contact', es: 'Contacto directo' },
  'support.contactUsers': { sr: 'Podrska korisnicima', en: 'Customer support', es: 'Atención al cliente' },
  'support.contactUsersBody': { sr: 'Pozovi nas za brza pitanja u vezi naloga i aplikacije', en: 'Call us for quick questions about your account and the app', es: 'Llámanos para consultas rápidas sobre tu cuenta y la aplicación' },
  'support.reportProblem': { sr: 'Prijavi problem', en: 'Report an issue', es: 'Informar de un problema' },
  'support.reportProblemBody': { sr: 'Posalji detalje ako neka profile funkcija ne radi kako treba', en: 'Send details if a profile feature is not working as expected', es: 'Envía detalles si alguna función del perfil no funciona como debería' },
  'support.hoursTitle': { sr: 'Radno vreme podrske', en: 'Support hours', es: 'Horario de soporte' },
  'support.weekdays': { sr: 'Ponedeljak - Petak', en: 'Monday - Friday', es: 'Lunes - Viernes' },
  'support.weekend': { sr: 'Subota - Nedelja', en: 'Saturday - Sunday', es: 'Sábado - Domingo' },
  'support.chatNote': { sr: '* Prosecno vreme odgovora na chat je manje od 5 minuta.', en: '* Average chat response time is under 5 minutes.', es: '* El tiempo medio de respuesta en chat es inferior a 5 minutos.' },
  'support.ticketNote': { sr: '* Odgovori na prijave problema stizu u roku od 24h.', en: '* Replies to reported issues arrive within 24 hours.', es: '* Las respuestas a los problemas reportados llegan en menos de 24 horas.' },
  'support.faq.1.q': { sr: 'Kako da azuriram podatke na profilu?', en: 'How do I update profile information?', es: '¿Cómo actualizo la información del perfil?' },
  'support.faq.1.a': { sr: 'Na ekranu Izmeni profil mozes promeniti ime, prezime, telefon, drzavu i profilnu fotografiju koristeci postojece nalog opcije.', en: 'On the Edit profile screen you can change your first name, last name, phone number, country and profile photo using the existing account options.', es: 'En la pantalla Editar perfil puedes cambiar tu nombre, apellido, teléfono, país y foto de perfil usando las opciones de cuenta existentes.' },
  'support.faq.2.q': { sr: 'Gde vidim favorite?', en: 'Where can I see my favorites?', es: '¿Dónde veo mis favoritos?' },
  'support.faq.2.a': { sr: 'Favorites ekran prikazuje sve stavke sacuvane preko postojeceg API-ja i omogucava brzo uklanjanje onoga sto ti vise ne treba.', en: 'The Favorites screen shows every item saved through the current API and lets you quickly remove anything you no longer need.', es: 'La pantalla Favoritos muestra todo lo guardado mediante la API actual y te permite eliminar rápidamente lo que ya no necesitas.' },
  'support.faq.3.q': { sr: 'Kako radi planer putovanja?', en: 'How does the trip planner work?', es: '¿Cómo funciona el planificador de viajes?' },
  'support.faq.3.a': { sr: 'Planer trenutno radi lokalno na uredjaju i ne trazi backend izmene. Mozes sacuvati destinaciju, datum, beleske i checklistu.', en: 'The planner currently works locally on the device and does not require backend changes. You can save a destination, date, notes and a checklist.', es: 'El planificador funciona actualmente en el dispositivo y no requiere cambios en el backend. Puedes guardar un destino, fecha, notas y una lista de verificación.' },
  'support.faq.4.q': { sr: 'Kako da promenim jezik aplikacije?', en: 'How do I change the app language?', es: '¿Cómo cambio el idioma de la aplicación?' },
  'support.faq.4.a': { sr: 'Na ekranu Jezik mozes izabrati podrzani jezik i sacuvati promenu preko korisnicke rute. Promena se odmah vidi u mobilnom interfejsu.', en: 'On the Language screen you can choose a supported language and save the change through the user route. The change is reflected immediately in the mobile interface.', es: 'En la pantalla Idioma puedes elegir un idioma compatible y guardar el cambio desde la ruta de usuario. El cambio se refleja de inmediato en la interfaz móvil.' },

  'about.supportTitle': { sr: 'Informacije i podrska', en: 'Information and support', es: 'Información y soporte' },
  'about.version': { sr: 'Verzija 2.4.0', en: 'Version 2.4.0', es: 'Versión 2.4.0' },
  'about.quote': {
    sr: '"Nasa misija je da svakom putniku pruzimo autenticno iskustvo Crne Gore, od skrivenih plaza na jugu do netaknutih planinskih vrhova na sjeveru."',
    en: '"Our mission is to give every traveler an authentic experience of Montenegro, from hidden southern beaches to untouched mountain peaks in the north."',
    es: '"Nuestra misión es ofrecer a cada viajero una experiencia auténtica de Montenegro, desde las playas del sur hasta los picos montañosos vírgenes del norte."',
  },
  'about.privacy': { sr: 'Politika privatnosti', en: 'Privacy policy', es: 'Política de privacidad' },
  'about.privacyBody': { sr: 'Kako stitimo vase podatke', en: 'How we protect your data', es: 'Cómo protegemos tus datos' },
  'about.terms': { sr: 'Uslovi koriscenja', en: 'Terms of use', es: 'Términos de uso' },
  'about.termsBody': { sr: 'Pravila koriscenja aplikacije', en: 'Rules for using the app', es: 'Normas de uso de la aplicación' },
  'about.contact': { sr: 'Kontaktirajte nas', en: 'Contact us', es: 'Contáctanos' },
  'about.contactBody': { sr: 'Pitanja, sugestije ili problemi', en: 'Questions, suggestions or issues', es: 'Preguntas, sugerencias o problemas' },
  'about.footerMade': { sr: 'Napravljeno sa srcem u Crnoj Gori', en: 'Made with heart in Montenegro', es: 'Hecho con corazón en Montenegro' },
  'about.footerRights': { sr: 'Sva prava zadrzana.', en: 'All rights reserved.', es: 'Todos los derechos reservados.' },

  'privacy.title': { sr: 'Privatnost i podaci', en: 'Privacy and data', es: 'Privacidad y datos' },
  'privacy.eyebrow': { sr: 'TRANSPARENTNO', en: 'TRANSPARENT', es: 'TRANSPARENTE' },
  'privacy.heroTitle': { sr: 'Sta mobilna aplikacija trenutno cuva i prikazuje.', en: 'What the mobile app currently stores and shows.', es: 'Qué guarda y muestra actualmente la app móvil.' },
  'privacy.heroBody': { sr: 'Ovaj ekran sluzi kao jasan pregled podataka koje frontend koristi i ogranicenja koja postoje dok backend ne dobije dodatne funkcionalnosti.', en: 'This screen gives a clear overview of the data used by the frontend and the current limitations until the backend gets additional functionality.', es: 'Esta pantalla ofrece una visión clara de los datos que usa el frontend y de las limitaciones actuales hasta que el backend reciba funcionalidades adicionales.' },
  'privacy.notesTitle': { sr: 'Bitne napomene', en: 'Important notes', es: 'Notas importantes' },
  'privacy.section.1.title': { sr: 'Podaci naloga', en: 'Account data', es: 'Datos de la cuenta' },
  'privacy.section.1.body': { sr: 'Na mobilnom frontendu trenutno prikazujemo osnovne podatke naloga kao sto su ime, prezime, email, telefon, drzava i fotografija profila.', en: 'The mobile frontend currently shows basic account data such as first name, last name, email, phone number, country and profile photo.', es: 'El frontend móvil muestra actualmente datos básicos de la cuenta como nombre, apellido, correo electrónico, teléfono, país y foto de perfil.' },
  'privacy.section.2.title': { sr: 'Lokalno sacuvani podaci', en: 'Locally stored data', es: 'Datos almacenados localmente' },
  'privacy.section.2.body': { sr: 'Planer putovanja i interesovanja mogu biti sacuvani lokalno na uredjaju, bez slanja novih podataka na backend.', en: 'Trip planner data and interests can be stored locally on the device without sending new data to the backend.', es: 'Los datos del planificador de viajes y los intereses pueden almacenarse localmente en el dispositivo, sin enviar nuevos datos al backend.' },
  'privacy.section.3.title': { sr: 'Kako prijaviti izmenu', en: 'How to request a change', es: 'Cómo solicitar un cambio' },
  'privacy.section.3.body': { sr: 'Ako zelis ispravku podataka ili dodatna objasnjenja, koristi ekran Pomoc i podrska ili kontakt adresu navedenu u aplikaciji.', en: 'If you want a data correction or additional explanation, use the Help and support screen or the contact address listed in the app.', es: 'Si quieres corregir datos o pedir más aclaraciones, usa la pantalla Ayuda y soporte o la dirección de contacto indicada en la app.' },
  'privacy.note.1': { sr: 'Frontend deo ne upravlja brisanjem naloga ni eksportom podataka bez backend podrske.', en: 'The frontend does not manage account deletion or data export without backend support.', es: 'El frontend no gestiona la eliminación de cuentas ni la exportación de datos sin soporte del backend.' },
  'privacy.note.2': { sr: 'Profilna fotografija i izmene osnovnih podataka koriste postojece API rute koje su vec dostupne.', en: 'Profile photo updates and basic profile edits use the existing API routes that are already available.', es: 'Las actualizaciones de la foto de perfil y los cambios básicos del perfil usan las rutas API existentes que ya están disponibles.' },
  'privacy.note.3': { sr: 'Za osetljive nalog akcije potrebno je dodatno backend resenje i dozvole.', en: 'Sensitive account actions require additional backend support and permissions.', es: 'Las acciones sensibles de la cuenta requieren soporte adicional del backend y permisos.' },

  'terms.title': { sr: 'Uslovi koriscenja', en: 'Terms of use', es: 'Términos de uso' },
  'terms.eyebrow': { sr: 'PREGLED USLOVA', en: 'TERMS OVERVIEW', es: 'RESUMEN DE TÉRMINOS' },
  'terms.heroTitle': { sr: 'Jasan sazetak pravila za mobilni deo aplikacije.', en: 'A clear summary of the rules for the mobile app.', es: 'Un resumen claro de las normas para la parte móvil de la aplicación.' },
  'terms.heroBody': { sr: 'Ovaj ekran daje frontend pregled najvaznijih pravila koriscenja dok se puna pravna verzija ne usaglasi na nivou celog sistema.', en: 'This screen gives a frontend overview of the most important usage rules until the full legal version is aligned across the system.', es: 'Esta pantalla ofrece una vista general en el frontend de las reglas de uso más importantes hasta que la versión legal completa quede alineada en todo el sistema.' },
  'terms.notesTitle': { sr: 'Napomene', en: 'Notes', es: 'Notas' },
  'terms.section.1.title': { sr: 'Koriscenje aplikacije', en: 'Using the app', es: 'Uso de la aplicación' },
  'terms.section.1.body': { sr: 'Mobilni frontend omogucava pregled destinacija, objekata, favorita i licnih podesavanja. Korisnik je odgovoran za tacnost podataka koje unosi na svom nalogu.', en: 'The mobile frontend lets you browse destinations, objects, favorites and personal settings. The user is responsible for the accuracy of the data entered on the account.', es: 'El frontend móvil permite ver destinos, objetos, favoritos y ajustes personales. El usuario es responsable de la exactitud de los datos que introduce en su cuenta.' },
  'terms.section.2.title': { sr: 'Sadrzaj i informacije', en: 'Content and information', es: 'Contenido e información' },
  'terms.section.2.body': { sr: 'Prikazani podaci zavise od dostupnih API odgovora. Frontend prikazuje ono sto backend trenutno vraca i ne garantuje dodatne funkcionalnosti koje nisu podrzane rutama sistema.', en: 'Displayed data depends on available API responses. The frontend shows what the backend currently returns and does not guarantee additional features that are not supported by system routes.', es: 'Los datos mostrados dependen de las respuestas API disponibles. El frontend muestra lo que el backend devuelve actualmente y no garantiza funciones adicionales que no estén soportadas por las rutas del sistema.' },
  'terms.section.3.title': { sr: 'Nalog i bezbednost', en: 'Account and security', es: 'Cuenta y seguridad' },
  'terms.section.3.body': { sr: 'Odjava, izmena osnovnih podataka i promena fotografije koriste postojece nalog mehanizme. Za dodatne nalog akcije potrebna je posebna backend podrska.', en: 'Logout, basic profile edits and photo changes use existing account mechanisms. Additional account actions require dedicated backend support.', es: 'Cerrar sesión, editar los datos básicos del perfil y cambiar la foto usan los mecanismos de cuenta existentes. Las acciones adicionales requieren soporte dedicado del backend.' },
  'terms.note.1': { sr: 'Favoriti, recenzije i profilni podaci vezani su za trenutno ulogovan nalog.', en: 'Favorites, reviews and profile data are tied to the currently signed-in account.', es: 'Favoritos, reseñas y datos de perfil están vinculados a la cuenta actualmente iniciada.' },
  'terms.note.2': { sr: 'Lokalno sacuvani planer radi samo na uredjaju na kom je kreiran.', en: 'The locally stored planner works only on the device where it was created.', es: 'El planificador almacenado localmente solo funciona en el dispositivo en el que fue creado.' },
  'terms.note.3': { sr: 'Za pravne i produkcione verzije uslova potrebno je uskladjivanje sa timom i backend specifikacijom.', en: 'Legal and production versions of the terms still need to be aligned with the team and the backend specification.', es: 'Las versiones legales y de producción de los términos aún deben alinearse con el equipo y la especificación del backend.' },

  'map.searchPlaceholder': { sr: 'Pretrazi objekte, rute...', en: 'Search objects, routes...', es: 'Buscar objetos, rutas...' },
  'map.geoUnsupported': { sr: 'Geolokacija nije podrzana u ovom browseru.', en: 'Geolocation is not supported in this browser.', es: 'La geolocalización no es compatible con este navegador.' },
  'map.geoDenied': { sr: 'Dozvolite pristup lokaciji u podesavanjima browsera.', en: 'Please allow location access in your browser settings.', es: 'Permite el acceso a la ubicación en la configuración del navegador.' },
  'map.geoUnavailable': { sr: 'Lokacija trenutno nije dostupna.', en: 'Location is currently unavailable.', es: 'La ubicación no está disponible por ahora.' },
  'map.geoFailed': { sr: 'Nije moguce dobiti vasu lokaciju.', en: 'Unable to get your location.', es: 'No se puede obtener tu ubicación.' },

  'event.title': { sr: 'Dogadjaj', en: 'Event', es: 'Evento' },
  'event.loadingError': { sr: 'Greska pri ucitavanju dogadjaja.', en: 'Failed to load the event.', es: 'Error al cargar el evento.' },
  'event.addedToPlanner': { sr: 'Dogadjaj je dodat u Planner', en: 'The event was added to Planner', es: 'El evento se añadió al planificador' },
  'event.free': { sr: 'Besplatno', en: 'Free', es: 'Gratis' },
  'event.buyTicket': { sr: 'Kupi kartu', en: 'Buy ticket', es: 'Comprar entrada' },
  'event.ticketAlert': { sr: 'Kupovina karte - Cena: {{price}}', en: 'Ticket purchase - Price: {{price}}', es: 'Compra de entrada - Precio: {{price}}' },
  'event.addToPlanner': { sr: 'Dodaj u Planner', en: 'Add to Planner', es: 'Añadir al planificador' },
  'event.about': { sr: 'O dogadjaju', en: 'About the event', es: 'Sobre el evento' },
  'event.descriptionFallback': { sr: 'Opis nije dostupan.', en: 'Description is not available.', es: 'La descripción no está disponible.' },
  'event.availableTickets': { sr: 'Dostupne ulaznice', en: 'Available tickets', es: 'Entradas disponibles' },
  'event.standardTicket': { sr: 'Standardna ulaznica', en: 'Standard ticket', es: 'Entrada estándar' },
  'event.select': { sr: 'Odaberi', en: 'Select', es: 'Seleccionar' },

  'object.titleFallback': { sr: 'Objekat', en: 'Object', es: 'Objeto' },
  'object.loadingError': { sr: 'Greska pri ucitavanju objekta.', en: 'Failed to load the object.', es: 'Error al cargar el objeto.' },
  'object.about': { sr: 'O {{name}}', en: 'About {{name}}', es: 'Acerca de {{name}}' },
  'object.amenitiesSoon': { sr: 'Sadrzaji ce biti dostupni uskoro.', en: 'Amenities will be available soon.', es: 'Los servicios estarán disponibles pronto.' },
  'object.writeReviewSoon': { sr: 'Forma za novu recenziju je jos u izradi.', en: 'The new review form is still being built.', es: 'El formulario de nueva reseña aún se está construyendo.' },
  'object.workingHoursMissing': { sr: 'Radno vreme nije navedeno', en: 'Working hours are not available', es: 'No hay horario disponible' },
  'object.nearbyNone': { sr: 'Nema drugih {{name}}a u istoj lokaciji.', en: 'There are no other nearby {{name}} items in the same location.', es: 'No hay otros elementos {{name}} cercanos en la misma ubicación.' },
  'object.allReviews': { sr: 'Sve recenzije', en: 'All reviews', es: 'Todas las reseñas' },
  'object.totalReviews': { sr: '{{count}} recenzija', en: '{{count}} reviews', es: '{{count}} reseñas' },

  'restaurant.title': { sr: 'Restoran', en: 'Restaurant', es: 'Restaurante' },
  'restaurant.loadingError': { sr: 'Greska pri ucitavanju restorana.', en: 'Failed to load the restaurant.', es: 'Error al cargar el restaurante.' },
  'restaurant.about': { sr: 'O restoranu', en: 'About the restaurant', es: 'Acerca del restaurante' },
  'restaurant.writeReviewSoon': { sr: 'Forma za novu recenziju je jos u izradi.', en: 'The new review form is still being built.', es: 'El formulario de nueva reseña aún se está construyendo.' },

  'hotel.loadingError': { sr: 'Greska pri ucitavanju hotela.', en: 'Failed to load the hotel.', es: 'Error al cargar el hotel.' },
  'hotel.bookingSoon': { sr: 'Booking sistem ce biti integrisan kasnije.', en: 'The booking flow will be integrated later.', es: 'El flujo de reserva se integrará más adelante.' },
  'hotel.addedToPlanner': { sr: 'Hotel je dodat u Planner', en: 'The hotel was added to Planner', es: 'El hotel se añadió al planificador' },
  'hotel.phoneMissing': { sr: 'Broj telefona nije dostupan', en: 'Phone number is not available', es: 'El número de teléfono no está disponible' },
  'hotel.galleryEmpty': { sr: 'Nema dostupnih slika', en: 'No images available', es: 'No hay imágenes disponibles' },
  'hotel.reviewTitle': { sr: 'Recenzije', en: 'Reviews', es: 'Reseñas' },
  'hotel.showLess': { sr: 'Prikazi manje >', en: 'Show Less >', es: 'Mostrar menos >' },
  'hotel.reviewAria': { sr: 'Ocena recenzije', en: 'Review rating', es: 'Calificación de la reseña' },
  'hotel.responseLabel': { sr: 'Odgovor hotela', en: 'Hotel response', es: 'Respuesta del hotel' },
  'hotel.reviewsPending': { sr: 'Recenzije ce biti prikazane kada stignu sa backenda.', en: 'Reviews will appear once they arrive from the backend.', es: 'Las reseñas aparecerán cuando lleguen desde el backend.' },
  'hotel.nearbyTitle': { sr: 'Obliznji hoteli', en: 'Nearby hotels', es: 'Hoteles cercanos' },
  'hotel.nearbyEmpty': { sr: 'Nema drugih hotela u istoj lokaciji.', en: 'There are no other hotels in the same location.', es: 'No hay otros hoteles en la misma ubicación.' },
  'hotel.visitWebsite': { sr: 'Poseti sajt', en: 'Visit website', es: 'Visitar sitio web' },
  'hotel.aboutTitle': { sr: 'O hotelu', en: 'About', es: 'Acerca del hotel' },
  'hotel.aboutFallback': { sr: 'Detaljnije informacije o ovom hotelu bice prikazane ovde.', en: 'Detailed information about this hotel will be displayed here.', es: 'Aquí se mostrarán detalles adicionales sobre este hotel.' },
  'hotel.locationMontenegro': { sr: 'Crna Gora', en: 'Montenegro', es: 'Montenegro' },

  'time.today': { sr: 'DANAS', en: 'TODAY', es: 'HOY' },
  'time.dayAgo': { sr: 'PRE 1 DAN', en: '1 DAY AGO', es: 'HACE 1 DÍA' },
  'time.daysAgo': { sr: 'PRE {{count}} DANA', en: '{{count}} DAYS AGO', es: 'HACE {{count}} DÍAS' },
  'time.weekAgo': { sr: 'PRE 1 NEDELJU', en: '1 WEEK AGO', es: 'HACE 1 SEMANA' },
  'time.weeksAgo': { sr: 'PRE {{count}} NEDELJE', en: '{{count}} WEEKS AGO', es: 'HACE {{count}} SEMANAS' },
  'time.monthAgo': { sr: 'PRE 1 MESEC', en: '1 MONTH AGO', es: 'HACE 1 MES' },
  'time.monthsAgo': { sr: 'PRE {{count}} MESECI', en: '{{count}} MONTHS AGO', es: 'HACE {{count}} MESES' },
  'time.yearAgo': { sr: 'PRE 1 GODINU', en: '1 YEAR AGO', es: 'HACE 1 AÑO' },
  'time.yearsAgo': { sr: 'PRE {{count}} GODINA', en: '{{count}} YEARS AGO', es: 'HACE {{count}} AÑOS' },

  'dashboard.period': { sr: 'Period prikaza', en: 'Display period', de: 'Anzeigezeitraum', fr: 'Période affichée', it: 'Periodo visualizzato', es: 'Periodo de visualización', me: 'Period prikaza' },
  'dashboard.groupedByDay': { sr: 'Grupisano po danu', en: 'Grouped by day', de: 'Nach Tag gruppiert', fr: 'Groupé par jour', it: 'Raggruppato per giorno', es: 'Agrupado por día', me: 'Grupisano po danu' },
  'dashboard.groupedByWeek': { sr: 'Grupisano po nedelji', en: 'Grouped by week', de: 'Nach Woche gruppiert', fr: 'Groupé par semaine', it: 'Raggruppato per settimana', es: 'Agrupado por semana', me: 'Grupisano po sedmici' },
  'dashboard.groupedByMonth': { sr: 'Grupisano po mesecu', en: 'Grouped by month', de: 'Nach Monat gruppiert', fr: 'Groupé par mois', it: 'Raggruppato per mese', es: 'Agrupado por mes', me: 'Grupisano po mjesecu' },

  'dashboard.cc.breadcrumbs.mainMenu': { sr: 'Glavni meni', en: 'Main Menu', de: 'Hauptmenü', fr: 'Menu principal', it: 'Menu principale', es: 'Menú principal', me: 'Glavni meni' },
  'dashboard.cc.breadcrumbs.dashboard': { sr: 'Kontrolna tabla', en: 'Dashboard', de: 'Dashboard', fr: 'Tableau de bord', it: 'Dashboard', es: 'Panel', me: 'Kontrolna tabla' },
  'dashboard.cc.title': { sr: 'Kontrolna tabla kreatora sadrzaja', en: 'Content Creator Dashboard', de: 'Dashboard für Content-Ersteller', fr: 'Tableau de bord du créateur de contenu', it: 'Dashboard del creatore di contenuti', es: 'Panel del creador de contenido', me: 'Kontrolna tabla kreatora sadržaja' },
  'dashboard.cc.subtitle': { sr: 'Pregled performansi sadrzaja, recenzija i dogadjaja koji slede.', en: 'Preview of your content performance, reviews and upcoming events.', de: 'Vorschau auf Inhaltsleistung, Bewertungen und anstehende Ereignisse.', fr: 'Aperçu des performances du contenu, des avis et des événements à venir.', it: 'Anteprima delle prestazioni dei contenuti, delle recensioni e dei prossimi eventi.', es: 'Vista previa del rendimiento de tu contenido, reseñas y próximos eventos.', me: 'Pregled performansi sadržaja, recenzija i narednih događaja.' },
  'dashboard.cc.loading': { sr: 'Ucitavanje kontrolne table kreatora sadrzaja...', en: 'Loading content creator dashboard...', de: 'Dashboard des Content-Erstellers wird geladen...', fr: 'Chargement du tableau de bord du créateur de contenu...', it: 'Caricamento del dashboard del creatore di contenuti...', es: 'Cargando el panel del creador de contenido...', me: 'Učitavanje kontrolne table kreatora sadržaja...' },
  'dashboard.cc.retry': { sr: 'Pokusaj ponovo', en: 'Retry', de: 'Erneut versuchen', fr: 'Réessayer', it: 'Riprova', es: 'Reintentar', me: 'Pokušaj ponovo' },
  'dashboard.cc.totalContent': { sr: 'Ukupan sadrzaj', en: 'Total content', de: 'Gesamter Inhalt', fr: 'Contenu total', it: 'Contenuto totale', es: 'Contenido total', me: 'Ukupan sadržaj' },
  'dashboard.cc.newReviews': { sr: 'Nove recenzije', en: 'New reviews', de: 'Neue Bewertungen', fr: 'Nouveaux avis', it: 'Nuove recensioni', es: 'Nuevas reseñas', me: 'Nove recenzije' },
  'dashboard.cc.averageRating': { sr: 'Prosecna ocena', en: 'Average rating', de: 'Durchschnittsbewertung', fr: 'Note moyenne', it: 'Valutazione media', es: 'Calificación media', me: 'Prosječna ocjena' },
  'dashboard.cc.upcoming30': { sr: 'Narednih 30 dana', en: 'Next 30 days', de: 'Nächste 30 Tage', fr: '30 prochains jours', it: 'Prossimi 30 giorni', es: 'Próximos 30 días', me: 'Narednih 30 dana' },
  'dashboard.cc.publishedContent': { sr: 'Objavljen sadrzaj', en: 'Published content', de: 'Veröffentlichte Inhalte', fr: 'Contenu publié', it: 'Contenuto pubblicato', es: 'Contenido publicado', me: 'Objavljen sadržaj' },
  'dashboard.cc.pendingContent': { sr: 'Na cekanju', en: 'Pending content', de: 'Ausstehender Inhalt', fr: 'Contenu en attente', it: 'Contenuto in attesa', es: 'Contenido pendiente', me: 'Na čekanju' },
  'dashboard.cc.rejectedContent': { sr: 'Odbijen sadrzaj', en: 'Rejected content', de: 'Abgelehnte Inhalte', fr: 'Contenu rejeté', it: 'Contenuto rifiutato', es: 'Contenido rechazado', me: 'Odbijen sadržaj' },
  'dashboard.cc.waitingForModeration': { sr: 'Ceka moderatorski pregled', en: 'Waiting for moderation', de: 'Wartet auf Moderation', fr: 'En attente de modération', it: 'In attesa di moderazione', es: 'Esperando moderación', me: 'Čeka moderaciju' },
  'dashboard.cc.needsEdits': { sr: 'Potrebne izmene pre ponovnog slanja', en: 'Needs edits before resubmission', de: 'Benötigt Änderungen vor dem erneuten Einreichen', fr: 'Nécessite des modifications avant renvoi', it: 'Servono modifiche prima del reinvio', es: 'Necesita cambios antes de reenviarlo', me: 'Potrebne izmjene prije ponovnog slanja' },
  'dashboard.cc.during': { sr: 'Tokom {{period}}', en: 'During {{period}}', de: 'Während {{period}}', fr: 'Pendant {{period}}', it: 'Durante {{period}}', es: 'Durante {{period}}', me: 'Tokom {{period}}' },
  'dashboard.cc.savedIntoPlans': { sr: 'Sacuvano u planovima putovanja turista', en: 'Saved into tourist trip plans', de: 'In den Reiseplänen der Touristen gespeichert', fr: 'Enregistré dans les plans de voyage des touristes', it: 'Salvato nei piani di viaggio dei turisti', es: 'Guardado en los planes de viaje de los turistas', me: 'Sačuvano u planovima putovanja turista' },
  'dashboard.cc.replySoon': { sr: 'Odgovori uskoro za veci kredibilitet', en: 'Reply soon to improve trust', de: 'Schnell antworten, um Vertrauen zu stärken', fr: 'Répondez vite pour renforcer la confiance', it: 'Rispondi presto per migliorare la fiducia', es: 'Responde pronto para mejorar la confianza', me: 'Odgovori uskoro za veći kredibilitet' },
  'dashboard.cc.engagementTrend': { sr: 'Trend angažovanja', en: 'Engagement trend', de: 'Engagement-Trend', fr: 'Tendance d’engagement', it: 'Andamento dell’engagement', es: 'Tendencia de interacción', me: 'Trend angažovanja' },
  'dashboard.cc.reviewOpen': { sr: 'Otvori recenzije', en: 'Open reviews', de: 'Bewertungen öffnen', fr: 'Ouvrir les avis', it: 'Apri recensioni', es: 'Abrir reseñas', me: 'Otvori recenzije' },
  'dashboard.cc.noEngagement': { sr: 'Nije zabelezena aktivnost angazovanja za ovaj period.', en: 'No engagement activity was recorded for this period.', de: 'Für diesen Zeitraum wurden keine Engagement-Aktivitäten erfasst.', fr: 'Aucune activité d’engagement n’a été enregistrée pour cette période.', it: 'Nessuna attività di engagement è stata registrata per questo periodo.', es: 'No se registró actividad de interacción en este período.', me: 'Nijesu zabilježene aktivnosti angažovanja za ovaj period.' },
  'dashboard.cc.acrossReviews': { sr: 'Tokom recenzija u {{period}}', en: 'Across reviews in {{period}}', de: 'Über Bewertungen in {{period}}', fr: 'Sur les avis en {{period}}', it: 'Tra le recensioni in {{period}}', es: 'En las reseñas de {{period}}', me: 'Tokom recenzija u {{period}}' },
  'dashboard.cc.totalReviews': { sr: 'Ukupno recenzija u izabranom periodu', en: 'Total reviews in the selected period', de: 'Gesamtzahl der Bewertungen im ausgewählten Zeitraum', fr: 'Total des avis sur la période sélectionnée', it: 'Totale recensioni nel periodo selezionato', es: 'Total de reseñas en el período seleccionado', me: 'Ukupno recenzija u izabranom periodu' },
  'dashboard.cc.ratingDistribution': { sr: 'Raspodela ocena', en: 'Rating distribution', de: 'Bewertungsverteilung', fr: 'Répartition des notes', it: 'Distribuzione delle valutazioni', es: 'Distribución de calificaciones', me: 'Raspodjela ocjena' },
  'dashboard.cc.oneToFiveStars': { sr: 'Od jedne do pet zvezdica', en: 'One star to five stars', de: 'Ein bis fünf Sterne', fr: 'D’une à cinq étoiles', it: 'Da una a cinque stelle', es: 'De una a cinco estrellas', me: 'Od jedne do pet zvjezdica' },
  'dashboard.cc.noRatings': { sr: 'Za ovaj period nema ocena.', en: 'No ratings are available for this period.', de: 'Für diesen Zeitraum sind keine Bewertungen verfügbar.', fr: 'Aucune note n’est disponible pour cette période.', it: 'Nessuna valutazione disponibile per questo periodo.', es: 'No hay calificaciones disponibles para este período.', me: 'Za ovaj period nema ocjena.' },
  'dashboard.cc.contentStatusSplit': { sr: 'Raspodela statusa sadrzaja', en: 'Content Status Split', de: 'Aufteilung des Inhaltsstatus', fr: 'Répartition des statuts de contenu', it: 'Ripartizione dello stato dei contenuti', es: 'Desglose del estado del contenido', me: 'Raspodjela statusa sadržaja' },
  'dashboard.cc.contentStatusSubtitle': { sr: 'Ukupno, objekti, dogadjaji i aktivnosti', en: 'Overall, objects, events and activities', de: 'Insgesamt, Objekte, Veranstaltungen und Aktivitäten', fr: 'Globalement, objets, événements et activités', it: 'In generale, oggetti, eventi e attività', es: 'En general, objetos, eventos y actividades', me: 'Ukupno, objekti, događaji i aktivnosti' },
  'dashboard.cc.total': { sr: 'ukupno', en: 'total', de: 'gesamt', fr: 'total', it: 'totale', es: 'total', me: 'ukupno' },
  'dashboard.cc.published': { sr: 'objavljeno', en: 'published', de: 'veröffentlicht', fr: 'publié', it: 'pubblicato', es: 'publicado', me: 'objavljeno' },
  'dashboard.cc.pending': { sr: 'na cekanju', en: 'pending', de: 'ausstehend', fr: 'en attente', it: 'in attesa', es: 'pendiente', me: 'na čekanju' },
  'dashboard.cc.rejected': { sr: 'odbijeno', en: 'rejected', de: 'abgelehnt', fr: 'rejeté', it: 'rifiutato', es: 'rechazado', me: 'odbijeno' },
  'dashboard.cc.noContentStatus': { sr: 'Status sadrzaja trenutno nije dostupan.', en: 'No content status is available right now.', de: 'Der Inhaltsstatus ist derzeit nicht verfügbar.', fr: 'Aucun statut de contenu n’est disponible pour le moment.', it: 'Nessuno stato del contenuto è disponibile al momento.', es: 'El estado del contenido no está disponible en este momento.', me: 'Status sadržaja trenutno nije dostupan.' },
  'dashboard.cc.topContent': { sr: 'Najuspesniji sadrzaj', en: 'Top Content', de: 'Top-Inhalte', fr: 'Contenu principal', it: 'Contenuto principale', es: 'Contenido destacado', me: 'Najbolji sadržaj' },
  'dashboard.cc.topContentSubtitle': { sr: 'Objekti, dogadjaji i aktivnosti sa najjacim angažovanjem', en: 'Objects, events and activities with strongest engagement score', de: 'Objekte, Veranstaltungen und Aktivitäten mit der stärksten Interaktion', fr: 'Objets, événements et activités avec le meilleur score d’engagement', it: 'Oggetti, eventi e attività con il punteggio di coinvolgimento più alto', es: 'Objetos, eventos y actividades con la mayor puntuación de interacción', me: 'Objekti, događaji i aktivnosti sa najjačim angažovanjem' },
  'dashboard.cc.manageContent': { sr: 'Upravljaj sadrzajem', en: 'Manage content', de: 'Inhalte verwalten', fr: 'Gérer le contenu', it: 'Gestisci contenuti', es: 'Administrar contenido', me: 'Upravljaj sadržajem' },
  'dashboard.cc.noDestination': { sr: 'Nema destinacije', en: 'No destination', de: 'Keine Destination', fr: 'Aucune destination', it: 'Nessuna destinazione', es: 'Sin destino', me: 'Nema destinacije' },
  'dashboard.cc.noRegion': { sr: 'Nema regiona', en: 'No region', de: 'Keine Region', fr: 'Aucune région', it: 'Nessuna regione', es: 'Sin región', me: 'Nema regiona' },
  'dashboard.cc.favorites': { sr: 'omiljene stavke', en: 'favorites', de: 'Favoriten', fr: 'favoris', it: 'preferiti', es: 'favoritos', me: 'omiljene stavke' },
  'dashboard.cc.plannerAdds': { sr: 'dodavanja u planer', en: 'planner adds', de: 'Planer-Hinzufügungen', fr: 'ajouts au planificateur', it: 'aggiunte al pianificatore', es: 'añadidos al planificador', me: 'dodavanja u planer' },
  'dashboard.cc.reviews': { sr: 'recenzije', en: 'reviews', de: 'Bewertungen', fr: 'avis', it: 'recensioni', es: 'reseñas', me: 'recenzije' },
  'dashboard.cc.avgRating': { sr: 'prosecna ocena', en: 'avg rating', de: 'durchschn. Bewertung', fr: 'note moyenne', it: 'valutazione media', es: 'calificación media', me: 'prosječna ocjena' },
  'dashboard.cc.noContentEngagement': { sr: 'Nema dostupnih podataka o angazovanju za ovaj period.', en: 'No content engagement data is available for this period.', de: 'Für diesen Zeitraum sind keine Engagement-Daten verfügbar.', fr: 'Aucune donnée d’engagement de contenu n’est disponible pour cette période.', it: 'Nessun dato di coinvolgimento dei contenuti è disponibile per questo periodo.', es: 'No hay datos de interacción de contenido disponibles para este período.', me: 'Nema dostupnih podataka o angažovanju za ovaj period.' },
  'dashboard.cc.topDestinations': { sr: 'Najuspesnije destinacije', en: 'Top Destinations', de: 'Top-Destinationen', fr: 'Destinations principales', it: 'Destinazioni principali', es: 'Destinos principales', me: 'Najbolje destinacije' },
  'dashboard.cc.topDestinationsSubtitle': { sr: 'Ucinak destinacija iz tvojeg sadrzaja', en: 'Destination performance from your content', de: 'Leistung der Destinationen aus deinen Inhalten', fr: 'Performance des destinations à partir de votre contenu', it: 'Prestazioni delle destinazioni dai tuoi contenuti', es: 'Rendimiento de destinos a partir de tu contenido', me: 'Učinak destinacija iz tvog sadržaja' },
  'dashboard.cc.noDestinationPerformance': { sr: 'Za ovaj period nema podataka o ucinaku destinacija.', en: 'No destination performance is available for this period.', de: 'Für diesen Zeitraum sind keine Leistungsdaten für Destinationen verfügbar.', fr: 'Aucune performance de destination n’est disponible pour cette période.', it: 'Nessuna performance delle destinazioni è disponibile per questo periodo.', es: 'No hay rendimiento de destinos disponible para este período.', me: 'Za ovaj period nema podataka o učinku destinacija.' },
  'dashboard.cc.upcomingEvents': { sr: 'Naredni dogadjaji', en: 'Upcoming Events', de: 'Anstehende Veranstaltungen', fr: 'Événements à venir', it: 'Prossimi eventi', es: 'Próximos eventos', me: 'Naredni događaji' },
  'dashboard.cc.upcomingEventsSubtitle': { sr: '{{count7}} u narednih 7 dana · {{count30}} u narednih 30 dana', en: '{{count7}} in next 7 days · {{count30}} in next 30 days', de: '{{count7}} in den nächsten 7 Tagen · {{count30}} in den nächsten 30 Tagen', fr: '{{count7}} dans les 7 prochains jours · {{count30}} dans les 30 prochains jours', it: '{{count7}} nei prossimi 7 giorni · {{count30}} nei prossimi 30 giorni', es: '{{count7}} en los próximos 7 días · {{count30}} en los próximos 30 días', me: '{{count7}} u narednih 7 dana · {{count30}} u narednih 30 dana' },
  'dashboard.cc.openEvents': { sr: 'Otvori dogadjaje', en: 'Open events', de: 'Veranstaltungen öffnen', fr: 'Ouvrir les événements', it: 'Apri eventi', es: 'Abrir eventos', me: 'Otvori događaje' },
  'dashboard.cc.noUpcomingEvents': { sr: 'Nema odobrenih dogadjaja u narednih 30 dana.', en: 'No upcoming approved events in the next 30 days.', de: 'In den nächsten 30 Tagen gibt es keine genehmigten anstehenden Veranstaltungen.', fr: 'Aucun événement approuvé à venir dans les 30 prochains jours.', it: 'Nessun evento approvato in arrivo nei prossimi 30 giorni.', es: 'No hay eventos aprobados próximos en los próximos 30 días.', me: 'Nema odobrenih događaja u narednih 30 dana.' },

  'auth.signOut.title': { sr: 'Potvrdi odjavu?', en: 'Confirm Sign Out?', de: 'Abmeldung bestätigen?', fr: 'Confirmer la déconnexion ?', it: 'Confermare l’uscita?', es: '¿Confirmar cierre de sesión?', me: 'Potvrdi odjavu?' },
  'auth.signOut.body': { sr: 'Jesi li siguran da zelis da zavrsis trenutnu sesiju i napustis platformu?', en: 'Are you sure you want to end your current session and leave the platform?', de: 'Möchten Sie die aktuelle Sitzung beenden und die Plattform verlassen?', fr: 'Voulez-vous vraiment terminer votre session et quitter la plateforme ?', it: 'Vuoi davvero terminare la sessione corrente e uscire dalla piattaforma?', es: '¿Seguro que quieres finalizar tu sesión actual y salir de la plataforma?', me: 'Jesi li siguran da želiš da završiš trenutnu sesiju i napustiš platformu?' },
  'auth.signOut.keepSignedIn': { sr: 'Ostani prijavljen', en: 'Keep me signed in', de: 'Angemeldet bleiben', fr: 'Rester connecté', it: 'Rimani connesso', es: 'Mantener sesión iniciada', me: 'Ostani prijavljen' },
  'auth.signOut.sessionSecurity': { sr: 'Bezbednost sesije', en: 'Session Security', de: 'Sitzungssicherheit', fr: 'Sécurité de la session', it: 'Sicurezza della sessione', es: 'Seguridad de la sesión', me: 'Bezbednost sesije' },
  'auth.signOut.sessionNote': { sr: 'Radi tvoje zastite, sesije se automatski prekidaju nakon 30 minuta neaktivnosti.', en: 'For your protection, sessions are automatically terminated after 30 minutes of inactivity.', de: 'Zu Ihrem Schutz werden Sitzungen nach 30 Minuten Inaktivität automatisch beendet.', fr: 'Pour votre protection, les sessions se terminent automatiquement après 30 minutes d’inactivité.', it: 'Per la tua sicurezza, le sessioni terminano automaticamente dopo 30 minuti di inattività.', es: 'Por tu seguridad, las sesiones se cierran automáticamente tras 30 minutos de inactividad.', me: 'Radi tvoje zaštite, sesije se automatski prekidaju nakon 30 minuta neaktivnosti.' },
  'auth.signUp.welcome': { sr: 'Dobro dosao', en: 'Welcome', de: 'Willkommen', fr: 'Bienvenue', it: 'Benvenuto', es: 'Bienvenido', me: 'Dobro došao' },
  'auth.signUp.firstName': { sr: 'Ime', en: 'First Name', de: 'Vorname', fr: 'Prénom', it: 'Nome', es: 'Nombre', me: 'Ime' },
  'auth.signUp.lastName': { sr: 'Prezime', en: 'Last Name', de: 'Nachname', fr: 'Nom de famille', it: 'Cognome', es: 'Apellido', me: 'Prezime' },
  'auth.signUp.dob': { sr: 'Datum rodjenja', en: 'Date of Birth', de: 'Geburtsdatum', fr: 'Date de naissance', it: 'Data di nascita', es: 'Fecha de nacimiento', me: 'Datum rođenja' },
  'auth.signUp.email': { sr: 'Email', en: 'Email', de: 'E-Mail', fr: 'E-mail', it: 'Email', es: 'Correo electrónico', me: 'Email' },
  'auth.signUp.password': { sr: 'Lozinka', en: 'Password', de: 'Passwort', fr: 'Mot de passe', it: 'Password', es: 'Contraseña', me: 'Lozinka' },
  'auth.signUp.confirmPassword': { sr: 'Potvrdi lozinku', en: 'Confirm Password', de: 'Passwort bestätigen', fr: 'Confirmer le mot de passe', it: 'Conferma password', es: 'Confirmar contraseña', me: 'Potvrdi lozinku' },
  'auth.signUp.button': { sr: 'Registruj se', en: 'Sign Up', de: 'Registrieren', fr: 'S’inscrire', it: 'Registrati', es: 'Crear cuenta', me: 'Registruj se' },
  'auth.signUp.help': { sr: 'Treba ti tehnicka podrska?', en: 'Need technical support?', de: 'Benötigst du technischen Support?', fr: 'Besoin d’assistance technique ?', it: 'Hai bisogno di supporto tecnico?', es: '¿Necesitas soporte técnico?', me: 'Treba ti tehnička podrška?' },
  'auth.signUp.helpLink': { sr: 'Kontaktiraj IT podrsku', en: 'Contact IT Helpdesk', de: 'IT-Support kontaktieren', fr: 'Contacter le support informatique', it: 'Contatta l’assistenza IT', es: 'Contactar con soporte IT', me: 'Kontaktiraj IT podršku' },
  'app.notice': { sr: 'Obavestenje', en: 'Notice', de: 'Hinweis', fr: 'Avis', it: 'Avviso', es: 'Aviso', me: 'Obavještenje' },

  'manager.objects.searchAria': { sr: 'Pretrazi objekte', en: 'Search objects', de: 'Objekte suchen', fr: 'Rechercher des objets', it: 'Cerca oggetti', es: 'Buscar objetos', me: 'Pretraži objekte' },
  'manager.objects.searchPlaceholder': { sr: 'Pretrazi po nazivu, kategoriji ili regionu...', en: 'Search by name, category or region...', de: 'Suche nach Name, Kategorie oder Region...', fr: 'Rechercher par nom, catégorie ou région...', it: 'Cerca per nome, categoria o regione...', es: 'Buscar por nombre, categoría o región...', me: 'Pretraži po nazivu, kategoriji ili regionu...' },
  'manager.objects.filter.status': { sr: 'Status', en: 'Status', de: 'Status', fr: 'Statut', it: 'Stato', es: 'Estado', me: 'Status' },
  'manager.objects.filter.allStatuses': { sr: 'Svi statusi', en: 'All statuses', de: 'Alle Status', fr: 'Tous les statuts', it: 'Tutti gli stati', es: 'Todos los estados', me: 'Svi statusi' },
  'manager.objects.filter.type': { sr: 'Tip', en: 'Type', de: 'Typ', fr: 'Type', it: 'Tipo', es: 'Tipo', me: 'Tip' },
  'manager.objects.filter.allTypes': { sr: 'Svi tipovi', en: 'All types', de: 'Alle Typen', fr: 'Tous les types', it: 'Tutti i tipi', es: 'Todos los tipos', me: 'Svi tipovi' },
  'manager.objects.filter.rating': { sr: 'Ocena', en: 'Rating', de: 'Bewertung', fr: 'Note', it: 'Valutazione', es: 'Calificación', me: 'Ocjena' },
  'manager.objects.filter.sortBy': { sr: 'Sortiraj po', en: 'Sort by', de: 'Sortieren nach', fr: 'Trier par', it: 'Ordina per', es: 'Ordenar por', me: 'Sortiraj po' },
  'manager.objects.filter.order': { sr: 'Redosled', en: 'Order', de: 'Reihenfolge', fr: 'Ordre', it: 'Ordine', es: 'Orden', me: 'Redosljed' },
  'manager.objects.filter.ascending': { sr: 'Rastuce', en: 'Ascending', de: 'Aufsteigend', fr: 'Croissant', it: 'Crescente', es: 'Ascendente', me: 'Rastuće' },
  'manager.objects.filter.descending': { sr: 'Opadajuce', en: 'Descending', de: 'Absteigend', fr: 'Décroissant', it: 'Decrescente', es: 'Descendente', me: 'Opadajuće' },
  'manager.objects.filter.apply': { sr: 'Primeni filtere', en: 'Apply filters', de: 'Filter anwenden', fr: 'Appliquer les filtres', it: 'Applica filtri', es: 'Aplicar filtros', me: 'Primijeni filtere' },
  'manager.objects.filter.reset': { sr: 'Resetuj filtere', en: 'Reset filters', de: 'Filter zurücksetzen', fr: 'Réinitialiser les filtres', it: 'Reimposta filtri', es: 'Restablecer filtros', me: 'Resetuj filtere' },
  'manager.objects.sort.name': { sr: 'Naziv', en: 'Name', de: 'Name', fr: 'Nom', it: 'Nome', es: 'Nombre', me: 'Naziv' },
  'manager.objects.sort.rating': { sr: 'Ocena', en: 'Rating', de: 'Bewertung', fr: 'Note', it: 'Valutazione', es: 'Calificación', me: 'Ocjena' },
  'manager.objects.sort.status': { sr: 'Status', en: 'Status', de: 'Status', fr: 'Statut', it: 'Stato', es: 'Estado', me: 'Status' },
  'manager.objects.rating.any': { sr: 'Bilo koja ocena', en: 'Any rating', de: 'Beliebige Bewertung', fr: 'Toute note', it: 'Qualsiasi valutazione', es: 'Cualquier calificación', me: 'Bilo koja ocjena' },
  'manager.objects.rating.1': { sr: '1.0+', en: '1.0+', de: '1.0+', fr: '1.0+', it: '1.0+', es: '1.0+', me: '1.0+' },
  'manager.objects.rating.2': { sr: '2.0+', en: '2.0+', de: '2.0+', fr: '2.0+', it: '2.0+', es: '2.0+', me: '2.0+' },
  'manager.objects.rating.3': { sr: '3.0+', en: '3.0+', de: '3.0+', fr: '3.0+', it: '3.0+', es: '3.0+', me: '3.0+' },
  'manager.objects.rating.3_5': { sr: '3.5+', en: '3.5+', de: '3.5+', fr: '3.5+', it: '3.5+', es: '3.5+', me: '3.5+' },
  'manager.objects.rating.4': { sr: '4.0+', en: '4.0+', de: '4.0+', fr: '4.0+', it: '4.0+', es: '4.0+', me: '4.0+' },
  'manager.objects.rating.4_5': { sr: '4.5+', en: '4.5+', de: '4.5+', fr: '4.5+', it: '4.5+', es: '4.5+', me: '4.5+' },
  'manager.objects.stats.totalObjects': { sr: 'Ukupan broj objekata', en: 'Total number of objects', de: 'Gesamtzahl der Objekte', fr: 'Nombre total d’objets', it: 'Numero totale di oggetti', es: 'Número total de objetos', me: 'Ukupan broj objekata' },
  'manager.objects.stats.matchingFilters': { sr: 'Odgovara aktivnim filterima', en: 'Matching active filters', de: 'Entspricht aktiven Filtern', fr: 'Correspond aux filtres actifs', it: 'Corrisponde ai filtri attivi', es: 'Coincide con los filtros activos', me: 'Odgovara aktivnim filterima' },
  'manager.objects.stats.onThisPage': { sr: 'Na ovoj stranici', en: 'On this page', de: 'Auf dieser Seite', fr: 'Sur cette page', it: 'In questa pagina', es: 'En esta página', me: 'Na ovoj stranici' },
  'manager.objects.stats.visibleRows': { sr: 'Vidljivi redovi', en: 'Visible rows', de: 'Sichtbare Zeilen', fr: 'Lignes visibles', it: 'Righe visibili', es: 'Filas visibles', me: 'Vidljivi redovi' },
  'manager.objects.stats.averageRating': { sr: 'Prosecna ocena', en: 'Average rating', de: 'Durchschnittsbewertung', fr: 'Note moyenne', it: 'Valutazione media', es: 'Calificación media', me: 'Prosječna ocjena' },
  'manager.objects.stats.acrossPage': { sr: 'Na trenutnoj stranici', en: 'Across current page', de: 'Auf der aktuellen Seite', fr: 'Sur la page actuelle', it: 'Nella pagina corrente', es: 'En la página actual', me: 'Na trenutnoj stranici' },
  'manager.objects.loading': { sr: 'Ucitavanje objekata...', en: 'Loading objects...', de: 'Objekte werden geladen...', fr: 'Chargement des objets...', it: 'Caricamento oggetti...', es: 'Cargando objetos...', me: 'Učitavanje objekata...' },
  'manager.objects.error.load': { sr: 'Neuspesno ucitavanje objekata.', en: 'Failed to load objects', de: 'Objekte konnten nicht geladen werden', fr: 'Échec du chargement des objets', it: 'Impossibile caricare gli oggetti', es: 'No se pudieron cargar los objetos', me: 'Neuspješno učitavanje objekata.' },
  'manager.objects.empty.filtered': { sr: 'Nema objekata za izabrane filtere.', en: 'No objects found for the selected filters.', de: 'Keine Objekte für die ausgewählten Filter gefunden.', fr: 'Aucun objet trouvé pour les filtres sélectionnés.', it: 'Nessun oggetto trovato per i filtri selezionati.', es: 'No se encontraron objetos para los filtros seleccionados.', me: 'Nema objekata za izabrane filtere.' },
  'manager.objects.reviewObject': { sr: 'Pregledaj objekat', en: 'Review object', de: 'Objekt prüfen', fr: 'Examiner l’objet', it: 'Rivedi oggetto', es: 'Revisar objeto', me: 'Pregledaj objekat' },
  'manager.objects.table.status': { sr: 'Status', en: 'Status', de: 'Status', fr: 'Statut', it: 'Stato', es: 'Estado', me: 'Status' },
  'manager.objects.table.objectDetails': { sr: 'Detalji objekta', en: 'Object details', de: 'Objektdetails', fr: 'Détails de l’objet', it: 'Dettagli oggetto', es: 'Detalles del objeto', me: 'Detalji objekta' },
  'manager.objects.table.type': { sr: 'Tip', en: 'Type', de: 'Typ', fr: 'Type', it: 'Tipo', es: 'Tipo', me: 'Tip' },
  'manager.objects.table.destination': { sr: 'Destinacija', en: 'Destination', de: 'Ziel', fr: 'Destination', it: 'Destinazione', es: 'Destino', me: 'Destinacija' },
  'manager.objects.table.rating': { sr: 'Ocena', en: 'Rating', de: 'Bewertung', fr: 'Note', it: 'Valutazione', es: 'Calificación', me: 'Ocjena' },
  'manager.objects.table.action': { sr: 'Akcija', en: 'Action', de: 'Aktion', fr: 'Action', it: 'Azione', es: 'Acción', me: 'Akcija' },
  'manager.objects.pagination.showing': { sr: 'Prikazano {{start}} do {{end}} od {{total}} objekata', en: 'Showing {{start}} to {{end}} of {{total}} objects', de: 'Zeige {{start}} bis {{end}} von {{total}} Objekten', fr: 'Affichage de {{start}} à {{end}} sur {{total}} objets', it: 'Mostrando da {{start}} a {{end}} di {{total}} oggetti', es: 'Mostrando de {{start}} a {{end}} de {{total}} objetos', me: 'Prikazano {{start}} do {{end}} od {{total}} objekata' },
  'manager.objects.pagination.pageSize': { sr: 'Velicina stranice', en: 'Page size', de: 'Seitengröße', fr: 'Taille de page', it: 'Dimensione pagina', es: 'Tamaño de página', me: 'Veličina stranice' },
  'manager.objects.pagination.previous': { sr: 'Prethodno', en: 'Previous', de: 'Zurück', fr: 'Précédent', it: 'Precedente', es: 'Anterior', me: 'Prethodno' },
  'manager.objects.pagination.next': { sr: 'Sledece', en: 'Next', de: 'Weiter', fr: 'Suivant', it: 'Successivo', es: 'Siguiente', me: 'Sledeće' },
  'manager.objects.selectedObject': { sr: 'Izabrani objekat', en: 'Selected object', de: 'Ausgewähltes Objekt', fr: 'Objet sélectionné', it: 'Oggetto selezionato', es: 'Objeto seleccionado', me: 'Izabrani objekat' },
  'manager.objects.featuredObject': { sr: 'Izdvojeni objekat', en: 'Featured object', de: 'Hervorgehobenes Objekt', fr: 'Objet en vedette', it: 'Oggetto in evidenza', es: 'Objeto destacado', me: 'Izdvojeni objekat' },
  'manager.objects.pricing': { sr: 'Cena', en: 'Pricing', de: 'Preisgestaltung', fr: 'Tarification', it: 'Prezzo', es: 'Precio', me: 'Cijena' },
  'manager.objects.locality': { sr: 'Lokalitet', en: 'Locality', de: 'Lokalität', fr: 'Localité', it: 'Località', es: 'Localidad', me: 'Lokalitet' },
  'manager.objects.description': { sr: 'Opis', en: 'Description', de: 'Beschreibung', fr: 'Description', it: 'Descrizione', es: 'Descripción', me: 'Opis' },
  'manager.objects.noDescription': { sr: 'Za ovaj objekat nije dostupan opis.', en: 'No description provided for this object.', de: 'Für dieses Objekt liegt keine Beschreibung vor.', fr: 'Aucune description fournie pour cet objet.', it: 'Nessuna descrizione disponibile per questo oggetto.', es: 'No hay descripción para este objeto.', me: 'Za ovaj objekat nije dostupan opis.' },
  'manager.objects.guestReviews': { sr: 'Recenzije gostiju', en: 'Guest reviews', de: 'Gästebewertungen', fr: 'Avis des invités', it: 'Recensioni ospiti', es: 'Reseñas de huéspedes', me: 'Recenzije gostiju' },
  'manager.objects.reviewsHint': { sr: 'Turisti ocenjuju samo ovaj objekat. Ispod su njihove ocene i eventualni odgovori kreatora sadrzaja.', en: 'Tourists review this object only. Below are their ratings and any Content Creator replies.', de: 'Touristen bewerten nur dieses Objekt. Unten sind ihre Bewertungen und etwaige Antworten des Content-Erstellers.', fr: 'Les touristes évaluent uniquement cet objet. Ci-dessous leurs notes et les éventuelles réponses du créateur de contenu.', it: 'I turisti recensiscono solo questo oggetto. Di seguito le loro valutazioni e le eventuali risposte del creatore di contenuti.', es: 'Los turistas reseñan solo este objeto. Abajo están sus calificaciones y posibles respuestas del creador de contenido.', me: 'Turisti ocjenjuju samo ovaj objekat. Ispod su njihove ocjene i eventualni odgovori kreatora sadržaja.' },
  'manager.objects.loadingGuestReviews': { sr: 'Ucitavanje recenzija gostiju…', en: 'Loading guest reviews…', de: 'Lade Gästebewertungen…', fr: 'Chargement des avis des invités…', it: 'Caricamento recensioni ospiti…', es: 'Cargando reseñas de huéspedes…', me: 'Učitavanje recenzija gostiju…' },
  'manager.objects.noGuestReviews': { sr: 'Jos nema recenzija gostiju za ovaj objekat.', en: 'No guest reviews yet for this object.', de: 'Noch keine Gästebewertungen für dieses Objekt.', fr: 'Aucun avis d’invité pour cet objet pour le moment.', it: 'Nessuna recensione ospite per questo oggetto al momento.', es: 'Aún no hay reseñas de huéspedes para este objeto.', me: 'Još nema recenzija gostiju za ovaj objekat.' },
  'manager.objects.ccReply': { sr: 'Odgovor kreatora', en: 'CC reply', de: 'Antwort des Erstellers', fr: 'Réponse du créateur', it: 'Risposta del creatore', es: 'Respuesta del creador', me: 'Odgovor kreatora' },
  'manager.objects.noCreatorReply': { sr: 'Kreator jos nije odgovorio', en: 'No creator reply yet', de: 'Noch keine Antwort des Erstellers', fr: 'Pas encore de réponse du créateur', it: 'Nessuna risposta del creatore per ora', es: 'Aún no hay respuesta del creador', me: 'Kreator još nije odgovorio' },
  'manager.objects.viewAllReviews': { sr: 'Pogledaj svih {{count}} recenzija na stranici objekta', en: 'View all {{count}} reviews on object page', de: 'Alle {{count}} Bewertungen auf der Objektseite ansehen', fr: 'Voir les {{count}} avis sur la page objet', it: 'Vedi tutte le {{count}} recensioni nella pagina oggetto', es: 'Ver las {{count}} reseñas en la página del objeto', me: 'Pogledaj svih {{count}} recenzija na stranici objekta' },
  'manager.objects.reportCreator': { sr: 'Prijavi kreatora', en: 'Report creator', de: 'Ersteller melden', fr: 'Signaler le créateur', it: 'Segnala creatore', es: 'Reportar creador', me: 'Prijavi kreatora' },
  'manager.objects.noCoordinates': { sr: 'Koordinate nisu dostupne za ovaj objekat.', en: 'Coordinates are not available for this object.', de: 'Koordinaten sind für dieses Objekt nicht verfügbar.', fr: 'Les coordonnées ne sont pas disponibles pour cet objet.', it: 'Le coordinate non sono disponibili per questo oggetto.', es: 'Las coordenadas no están disponibles para este objeto.', me: 'Koordinate nijesu dostupne za ovaj objekat.' },
  'manager.objects.openObjectReview': { sr: 'Otvori pregled objekta i komentare gostiju', en: 'Open object review & guest feedback', de: 'Objektprüfung und Gästefeedback öffnen', fr: 'Ouvrir la revue de l’objet et les retours des invités', it: 'Apri revisione oggetto e feedback ospiti', es: 'Abrir revisión del objeto y comentarios de huéspedes', me: 'Otvori pregled objekta i komentare gostiju' },
  'manager.objects.empty.noObjectSelected': { sr: 'Nijedan objekat nije izabran', en: 'No object selected', de: 'Kein Objekt ausgewählt', fr: 'Aucun objet sélectionné', it: 'Nessun oggetto selezionato', es: 'Ningún objeto seleccionado', me: 'Nijedan objekat nije izabran' },
  'manager.objects.empty.pickObjectTitle': { sr: 'Izaberi objekat iz tabele', en: 'Pick an object from the table', de: 'Wähle ein Objekt aus der Tabelle', fr: 'Choisissez un objet dans le tableau', it: 'Seleziona un oggetto dalla tabella', es: 'Elige un objeto de la tabla', me: 'Izaberi objekat iz tabele' },
  'manager.objects.empty.pickObjectBody': { sr: 'Izaberi red da pregledas medije, lokaciju i status odobrenja pre otvaranja kompletnog pregleda.', en: 'Select a row to preview media, location, and approval status before opening the full review.', de: 'Wähle eine Zeile, um Medien, Standort und Freigabestatus vor der vollständigen Prüfung anzuzeigen.', fr: 'Sélectionnez une ligne pour prévisualiser les médias, l’emplacement et le statut d’approbation avant d’ouvrir la revue complète.', it: 'Seleziona una riga per visualizzare media, posizione e stato di approvazione prima di aprire la revisione completa.', es: 'Selecciona una fila para previsualizar medios, ubicación y estado de aprobación antes de abrir la revisión completa.', me: 'Izaberi red da pregledaš medije, lokaciju i status odobrenja prije otvaranja kompletnog pregleda.' },
  'manager.objects.totalCount': { sr: 'Ukupno: {{count}} objekata', en: 'Total: {{count}} objects', de: 'Insgesamt: {{count}} Objekte', fr: 'Total : {{count}} objets', it: 'Totale: {{count}} oggetti', es: 'Total: {{count}} objetos', me: 'Ukupno: {{count}} objekata' },
  'manager.objects.status.approved': { sr: 'Odobreno', en: 'Approved', de: 'Genehmigt', fr: 'Approuvé', it: 'Approvato', es: 'Aprobado', me: 'Odobreno' },
  'manager.objects.status.pending': { sr: 'Na cekanju', en: 'Pending', de: 'Ausstehend', fr: 'En attente', it: 'In attesa', es: 'Pendiente', me: 'Na čekanju' },
  'manager.objects.status.rejected': { sr: 'Odbijeno', en: 'Rejected', de: 'Abgelehnt', fr: 'Rejeté', it: 'Rifiutato', es: 'Rechazado', me: 'Odbijeno' },
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
        document.documentElement.lang = this.currentLocale();
      }
    });
  }

  language(): AppLanguage {
    return this.activeLanguage();
  }

  currentLocale(): string {
    switch (this.activeLanguage()) {
      case 'de':
        return 'de-DE';
      case 'fr':
        return 'fr-FR';
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
    const template = TRANSLATIONS[key]?.[language] ?? TRANSLATIONS[key]?.en ?? TRANSLATIONS[key]?.sr ?? key;

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
    const normalized = language?.trim().toLowerCase();

    if (!normalized) {
      return 'sr';
    }

    if (normalized === 'me' || normalized === 'cnr') {
      return 'me';
    }

    if (normalized.startsWith('sr') || normalized === 'el' || normalized === 'gr') {
      return 'sr';
    }

    if (normalized.startsWith('de')) {
      return 'de';
    }

    if (normalized.startsWith('fr')) {
      return 'fr';
    }

    if (normalized.startsWith('es')) {
      return 'es';
    }

    if (normalized.startsWith('it')) {
      return 'it';
    }

    if (normalized.startsWith('en')) {
      return 'en';
    }

    return 'sr';
  }

  private resolveTranslationLocale(language: AppLanguage): TranslationLocale {
    switch (language) {
      case 'me':
        return 'me';
      case 'sr':
        return 'sr';
      case 'de':
      case 'fr':
      case 'es':
      case 'it':
      case 'en':
      default:
        return language;
    }
  }
}
