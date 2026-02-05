const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-diff-view.threshold", (value) => {
        this.threshold = value;
      }),
    );
    this.diffService = null;
    this.lastEditor1 = null;
    this.lastEditor2 = null;
  },

  deactivate() {
    this.diffService = null;
    this.disposables.dispose();
  },

  clearLayer(editor) {
    const layer = editor?.scrollmap?.layers.get('diff');
    if (layer) {
      layer.cache.set('data', null);
      layer.updateSync();
    }
  },

  consumeDiffService(diffService) {
    this.diffService = diffService;
    let subscription = diffService.onDidUpdate?.((data) => {
      const { chunks, editor1, editor2 } = data || {};
      if (this.lastEditor1 && this.lastEditor1 !== editor1) {
        this.clearLayer(this.lastEditor1);
      }
      if (this.lastEditor2 && this.lastEditor2 !== editor2) {
        this.clearLayer(this.lastEditor2);
      }
      this.lastEditor1 = editor1;
      this.lastEditor2 = editor2;
      const layer1 = editor1?.scrollmap?.layers.get('diff');
      if (layer1) {
        layer1.cache.set('data', chunks
          ? { chunks, startKey: 'oldLineStart', endKey: 'oldLineEnd', cls: 'added' }
          : null
        )
        layer1.updateSync();
      }
      const layer2 = editor2?.scrollmap?.layers.get('diff');
      if (layer2) {
        layer2.cache.set('data', chunks ? { chunks, startKey: 'newLineStart', endKey: 'newLineEnd', cls: 'removed' }
          : null
        )
        layer2.updateSync();
      }
    });
    return new Disposable(() => {
      this.clearLayer(this.lastEditor1);
      this.clearLayer(this.lastEditor2);
      this.lastEditor1 = null;
      this.lastEditor2 = null;
      this.diffService = null;
      subscription?.dispose();
    });
  },

  provideScrollmap() {
    return {
      name: "diff",
      description: "Diff-view chunk markers",
      timer: 100,
      initialize: ({ disposables, update }) => {
        disposables.add(
          atom.config.onDidChange("scrollmap-diff-view.threshold", update),
        );
      },
      getItems: ({ editor, cache }) => {
        const data = cache.get('data');
        if (!data) {
          return [];
        }
        const { chunks, startKey, endKey, cls } = data;
        const items = [];
        for (const chunk of chunks) {
          for (let bufferRow = chunk[startKey]; bufferRow < chunk[endKey]; bufferRow++) {
            items.push({
              row: editor.screenRowForBufferRow(bufferRow),
              cls,
            });
          }
        }
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};
