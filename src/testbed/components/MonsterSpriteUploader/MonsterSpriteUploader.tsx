'use client';

import { useMonsterSpriteUploader } from './MonsterSpriteUploader.hook';
import { styles } from './MonsterSpriteUploader.styles';
import type { MonsterSpriteUploaderViewModel } from './MonsterSpriteUploader.types';
import { MonsterSpriteUploaderCatalogList } from './MonsterSpriteUploaderCatalogList';
import { MonsterSpriteUploaderForm } from './MonsterSpriteUploaderForm';

/** Pure view: the upload form on top, the read-only catalog below. Everything comes from the view
 *  model, so tests and previews need no network. */
export function MonsterSpriteUploaderView(viewModel: MonsterSpriteUploaderViewModel) {
  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Monster Sprite Uploader</h2>
        <MonsterSpriteUploaderForm {...viewModel} fileInputResetKey={viewModel.catalogRows.length} />
        <MonsterSpriteUploaderCatalogList
          rows={viewModel.catalogRows}
          pendingCatalogKey={viewModel.pendingCatalogKey}
          catalogEditError={viewModel.catalogEditError}
          onCatalogEdit={viewModel.onCatalogEdit}
        />
      </div>
    </div>
  );
}

/** Connected component for the testbed: form and catalog state come from the uploader hook. */
export function MonsterSpriteUploader() {
  return <MonsterSpriteUploaderView {...useMonsterSpriteUploader()} />;
}
