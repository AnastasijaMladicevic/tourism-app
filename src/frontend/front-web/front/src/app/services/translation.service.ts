import { Injectable, effect, signal } from '@angular/core';

export type AppLanguage = 'me' | 'sr' | 'en' | 'de' | 'fr' | 'es' | 'it';
type TranslationLocale = 'sr' | 'en' | 'de' | 'fr' | 'es' | 'it';
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
