const { Disposable } = require("atom");

module.exports = {

  activate() {
    this.editors = new Map();
    this.diffService = null;
  },

  deactivate() {
    this.editors.clear();
    this.diffService = null;
  },

  consumeDiffService(diffService) {
    this.diffService = diffService;

    const updateAll = () => {
      for (const ctx of this.editors.values()) {
        ctx.update();
      }
    };

    let subscription = diffService.onDidUpdate?.(updateAll);

    return new Disposable(() => {
      this.diffService = null;
      subscription?.dispose();
    });
  },

  provideScrollmap() {
    const self = this;
    return {
      name: "diff",
      timer: 100,
      subscribe: (editor, update) => {
        self.editors.set(editor, { update });
        return new Disposable(() => self.editors.delete(editor));
      },
      recalculate: (editor) => {
        if (!self.diffService) {
          return [];
        }
        const data = self.diffService.getDiffView?.();
        if (!data?.chunks) {
          return [];
        }
        const { chunks, editor1, editor2 } = data;
        const items = [];
        if (editor === editor1) {
          for (const chunk of chunks) {
            for (let bufferRow = chunk.oldLineStart; bufferRow < chunk.oldLineEnd; bufferRow++) {
              items.push({
                row: editor.screenRowForBufferRow(bufferRow),
                cls: "added",
              });
            }
          }
        } else if (editor === editor2) {
          for (const chunk of chunks) {
            for (let bufferRow = chunk.newLineStart; bufferRow < chunk.newLineEnd; bufferRow++) {
              items.push({
                row: editor.screenRowForBufferRow(bufferRow),
                cls: "removed",
              });
            }
          }
        }
        return items;
      },
    };
  },
};
