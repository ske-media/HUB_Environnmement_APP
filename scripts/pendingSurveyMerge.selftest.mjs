#!/usr/bin/env node
/**
 * Garde-fou du merge de queue offline (sans framework).
 * Aligné sur src/lib/offline/pendingSurveyMerge.ts
 */

function pickLoadedSurveySpecificData(pending, serverSpecificData) {
  if (pending) {
    return pending.specificData ?? {};
  }
  if (serverSpecificData) {
    return serverSpecificData;
  }
  return null;
}

function mergePendingSurveyEntry(existing, incoming) {
  if (!existing || existing.surveyId !== incoming.surveyId) {
    return { entry: incoming, photosToCleanup: [] };
  }

  const incomingPaths = new Set((incoming.photos ?? []).map((photo) => photo.fieldPath));
  const existingPhotos = existing.photos ?? [];
  const photosToCleanup = existingPhotos.filter((photo) => incomingPaths.has(photo.fieldPath));
  const keptExistingPhotos = existingPhotos.filter((photo) => !incomingPaths.has(photo.fieldPath));

  const entry = {
    ...incoming,
    createdAt: existing.createdAt,
    isEdit: existing.isEdit || incoming.isEdit,
    siteId: incoming.siteId ?? existing.siteId,
    createdBy: incoming.createdBy ?? existing.createdBy,
    surveyType: incoming.surveyType || existing.surveyType,
    name: incoming.name !== undefined && incoming.name !== null ? incoming.name : existing.name,
    photos: [...keptExistingPhotos, ...(incoming.photos ?? [])],
  };

  return { entry, photosToCleanup };
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    console.error(`FAIL ${label}\n  got:      ${a}\n  expected: ${b}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok  ${label}`);
}

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok  ${label}`);
}

// --- pickLoadedSurveySpecificData ---
assertEqual(
  pickLoadedSurveySpecificData(
    { specificData: { note: 'locale' } },
    { note: 'serveur' }
  ),
  { note: 'locale' },
  'pending gagne sur le serveur (rechargement de fiche)'
);

assertEqual(
  pickLoadedSurveySpecificData(null, { note: 'serveur' }),
  { note: 'serveur' },
  'sans pending, on prend le serveur'
);

assertEqual(
  pickLoadedSurveySpecificData({ specificData: {} }, { note: 'serveur' }),
  {},
  'une pending vide l\'emporte quand même (elle est plus récente)'
);

assertEqual(
  pickLoadedSurveySpecificData(null, null),
  null,
  'rien nulle part → null'
);

// --- mergePendingSurveyEntry : le bug rapporté ---
const firstSave = {
  surveyId: 's1',
  surveyType: 'soil',
  siteId: 'site-a',
  createdBy: 'user-1',
  isEdit: false,
  specificData: { designation_point: 'P1', profondeur: '2m', remarque: 'première saisie' },
  name: 'P1',
  photos: [{ key: 'blob-a', fieldPath: 'photos.photo_sondage_url', originalName: 'a.jpg', mimeType: 'image/jpeg' }],
  createdAt: 1000,
  attempts: 0,
};

const secondSaveFromStaleServer = {
  surveyId: 's1',
  surveyType: 'soil',
  siteId: 'site-a',
  createdBy: 'user-1',
  isEdit: true,
  specificData: { designation_point: 'P1', profondeur: '', remarque: 'seconde saisie' },
  name: 'P1',
  photos: [],
  createdAt: 2000,
  attempts: 0,
};

const mergedStale = mergePendingSurveyEntry(firstSave, secondSaveFromStaleServer);
assertEqual(
  mergedStale.entry.photos.map((p) => p.key),
  ['blob-a'],
  'seconde sauvegarde sans nouvelle photo : les blobs déjà queued sont conservés'
);
assert(mergedStale.entry.createdAt === 1000, 'createdAt d\'origine conservé');
assert(mergedStale.entry.isEdit === true, 'isEdit passe à true après réouverture');
assertEqual(mergedStale.photosToCleanup, [], 'aucune photo à purger si le champ n\'est pas remplacé');

const secondSaveWithNewPhoto = {
  ...secondSaveFromStaleServer,
  specificData: { designation_point: 'P1', profondeur: '2m', remarque: 'seconde saisie' },
  photos: [{ key: 'blob-b', fieldPath: 'photos.photo_sondage_url', originalName: 'b.jpg', mimeType: 'image/jpeg' }],
};
const mergedReplace = mergePendingSurveyEntry(firstSave, secondSaveWithNewPhoto);
assertEqual(
  mergedReplace.entry.photos.map((p) => p.key),
  ['blob-b'],
  'nouvelle photo sur le même fieldPath remplace l\'ancienne'
);
assertEqual(
  mergedReplace.photosToCleanup.map((p) => p.key),
  ['blob-a'],
  'l\'ancien blob du champ remplacé est à purger'
);

const firstSaveTwoPhotos = {
  ...firstSave,
  photos: [
    { key: 'blob-a', fieldPath: 'photos.photo_sondage_url', originalName: 'a.jpg', mimeType: 'image/jpeg' },
    { key: 'blob-lit', fieldPath: 'observations.0.photo_lithologie_url', originalName: 'lit.jpg', mimeType: 'image/jpeg' },
  ],
};
const mergedPartial = mergePendingSurveyEntry(firstSaveTwoPhotos, secondSaveWithNewPhoto);
assertEqual(
  mergedPartial.entry.photos.map((p) => p.key).sort(),
  ['blob-b', 'blob-lit'].sort(),
  'remplacement ciblé : les photos des autres champs restent'
);

assertEqual(
  mergePendingSurveyEntry(null, firstSave).entry,
  firstSave,
  'première mise en queue : pas de merge'
);

assertEqual(
  mergePendingSurveyEntry(firstSave, {
    ...secondSaveFromStaleServer,
    specificData: {
      designation_point: 'P1',
      profondeur: '2m',
      remarque: 'seconde saisie',
    },
  }).entry.specificData,
  { designation_point: 'P1', profondeur: '2m', remarque: 'seconde saisie' },
  'après rechargement depuis la pending, la 2e sauvegarde conserve la 1re saisie et ajoute la 2e'
);

// Scénario complet : réouverture ne doit PAS recharger le serveur
const serverCopy = { designation_point: 'P1', profondeur: '', remarque: '' };
const pendingCopy = { designation_point: 'P1', profondeur: '2m', remarque: 'première saisie' };
assertEqual(
  pickLoadedSurveySpecificData({ specificData: pendingCopy }, serverCopy),
  pendingCopy,
  'à la réouverture, le formulaire affiche la pending et pas la copie serveur'
);

if (process.exitCode) {
  console.error('\nselftest pendingSurveyMerge : échecs');
  process.exit(1);
}
console.log('\nselftest pendingSurveyMerge : OK');
