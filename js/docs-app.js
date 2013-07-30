var DocsApp = function() {
  App.call(this, DOCS_WINDOW_ID, 'docs-app.html');
};

DocsApp.ANIMATION_INTERVAL = 100;

DocsApp.prototype = {
  __proto__: App.prototype
};

DocsApp.prototype.initDocument = function() {
  App.prototype.initDocument.call(this);

  // Set padding as the smae size of scroll width.
  var paperContainer = this.get('.paper-container');
  var scrollSize =
      this.get('#docs-main').clientWidth -
      paperContainer.clientWidth;
  paperContainer.style.paddingLeft = scrollSize + 'px';

  // Obtains the elements.
  this.paper_ = extend(this.get('.paper'), PaperEditAdapter);
  this.cursors_ = this.document.querySelectorAll('.cursor');

  // Init variables.
  this.paper_.innerText = '';
  this.editors_ = [];
  this.lastText_ = '';
  this.usedKeyword_ = {};

  // Register events.
  this.paper_.addEventListener('input', this.onInput_.bind(this));
  this.intervalID_ = this.window.setInterval(
      this.onStep_.bind(this), DocsApp.ANIMATION_INTERVAL);
};

DocsApp.prototype.onInput_ = function(e) {
  console.log(e);
  // Get difference made by input.
  var diff = calcEditDistance(this.lastText_, this.paper_.value, 1, 1, 3);
  this.lastText_ = this.paper_.value;
  var indexMap = IndexMap.fromDiff(diff);
  for (var i = 0; i < this.cursors_.length; i++) {
    var cursor = this.cursors_[i];
    if (cursor.editor) {
      var index = cursor.editor.applyIndexMap(indexMap);
      if (index != null) {
        this.setCursorPosition_(cursor, index);
      } else {
        cursor.classList.remove('active');
        cursor.classList.add('stop');
        cursor.editor = null;
      }
    }
  }
};

/**
 * The interaval callback function that is called regularly while the Docs.app
 * is open.
 * @private
 */
DocsApp.prototype.onStep_ = function() {
  // Save the selection index.
  var selectionStart = this.paper_.selectionStart;
  var selectionEnd = this.paper_.selectionEnd;

  console.log(selectionStart, selectionEnd);

  // Find the editable phrases and adds editors to them.
  var keywordAt = this.findBotKeyword_();
  if (keywordAt) {
    for (var i = 0; i < this.cursors_.length; i++) {
      if (this.cursors_[i].editor)
        continue;
      this.usedKeyword_[keywordAt.keyword] = true;
      this.cursors_[i].editor = new Editor(
          keywordAt.index, keywordAt.keyword, 'Type', keywordAt.result);
      break;
    }
  }

  // Drive the existing editors.
  for (var i = 0; i < this.cursors_.length; i++) {
    var editor = this.cursors_[i].editor;
    if (!editor)
      continue;
    var result = editor.step(null /* Should be the result of diff.
                                     Not implemented yet. */);
    switch (result[0]) {
      case 'ShowCursor':
        this.cursors_[i].classList.add('active');
        break;
      case 'MoveCursor':
        this.setCursorPosition_(this.cursors_[i], result[1]);
        break;
      case 'Insert':
        this.paper_.insertChar(result[1], result[2]);
        this.setCursorPosition_(this.cursors_[i], result[1] + 1);
        this.lastText_ = this.lastText_.substr(0, result[1]) +
                         result[2] +
                         this.lastText_.substr(result[1]);
        if (selectionStart >= result[1]) {
          selectionStart++;
        }
        if (selectionEnd >= result[1]) {
          selectionEnd++;
        }
        break;
      case 'Delete':
        this.paper_.deleteChar(result[1]);
        this.setCursorPosition_(this.cursors_[i], result[1]);
        this.lastText_ = this.lastText_.substr(0, result[1]) +
                         this.lastText_.substr(result[1] + 1);
        if (selectionStart >= result[1]) {
          selectionStart--;
        }
        if (selectionEnd >= result[1]) {
          selectionEnd--;
        }
        break;
      case 'Exit':
        this.cursors_[i].editor = null;
        this.cursors_[i].classList.remove('active');
        break;
    }
  }

  // Restore the selection index.
  this.paper_.selectionStart = selectionStart;
  this.paper_.selectionEnd = selectionEnd;
};

/**
 * Finds the keyword from the paper which can be replaced with the other phrase.
 * @private
 */
DocsApp.prototype.findBotKeyword_ = function() {
  var paperText = this.paper_.value;
  console.log(paperText);
  for (var i = 0; i < BOT_KEYWORD_MAP.length; i++) {
    for (var keyword in BOT_KEYWORD_MAP[i]) {
      if (this.usedKeyword_[keyword])
        continue;
      var index = paperText.indexOf(' ' + keyword + ' ');
      if (index == -1)
        continue;
      return {
        keyword: keyword,
        index: index + 1,
        result: BOT_KEYWORD_MAP[i][keyword]
      };
    }
  }
  return null;
};

DocsApp.prototype.setCursorPosition_ = function(cursor, index) {
  var pos = this.paper_.getCursorPosition(index);
  cursor.style.left = pos.x + 'px';
  cursor.style.top = pos.y + 'px';
};

DocsApp.prototype.close = function() {
  if (this.intervalID_) {
    clearInterval(this.intervalID_);
    this.intervalID_ = null;
  }
  App.prototype.close.call(this);
};

new DocsApp().start();
