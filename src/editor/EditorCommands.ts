// ═══════════════════════════════════════════════════════════════
// Editor Commands — Selection-based formatting abstraction
// Uses window.getSelection() and Range for DOM manipulation
// instead of deprecated document.execCommand.
// ═══════════════════════════════════════════════════════════════

function getSelectionInfo() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (range.collapsed && !sel.anchorNode?.parentElement?.isContentEditable) return null;
  return { sel, range };
}

function getParentFormatInfo(node, format) {
  let el = node.parentElement;
  while (el && el !== document.body) {
    const tag = el.tagName?.toLowerCase();
    if (tag === 'div' && el.contentEditable === 'true') break;
    if (format === 'bold' && (tag === 'strong' || tag === 'b')) return { el, active: true };
    if (format === 'italic' && (tag === 'em' || tag === 'i')) return { el, active: true };
    if (format === 'underline' && tag === 'u') return { el, active: true };
    if (format === 'strikethrough' && (tag === 's' || tag === 'strike' || tag === 'del')) return { el, active: true };
    if (format === 'code' && (tag === 'code' || el.classList?.contains('inline-code'))) return { el, active: true };
    el = el.parentElement;
  }
  return { el: null, active: false };
}

function canMergeTextNodes(left, right) {
  if (!left || !right) return false;
  if (left.nodeType !== Node.TEXT_NODE || right.nodeType !== Node.TEXT_NODE) return false;
  return left.parentElement === right.parentElement;
}

function splitTextNode(textNode, offset) {
  if (offset === 0) return [null, textNode];
  if (offset === textNode.textContent.length) return [textNode, null];
  const before = textNode.splitText(offset);
  return [textNode, before];
}

export class EditorCommands {
  el: HTMLElement | null;

  constructor(element: HTMLElement | null) {
    this.el = element;
  }
  
  focus() {
    this.el?.focus();
  }
  
  exec(command, value = null) {
    try {
      this.focus();
      const result = document.execCommand(command, false, value);
      return result;
    } catch (e) {
      console.warn(`execCommand(${command}) failed:`, e);
      return false;
    }
  }
  
  toggleBold() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    if (range.collapsed) {
      this._toggleInlineFormatAtCursor('bold');
    } else {
      this._toggleInlineFormatRange('bold', range);
    }
    
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  toggleItalic() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    if (range.collapsed) {
      this._toggleInlineFormatAtCursor('italic');
    } else {
      this._toggleInlineFormatRange('italic', range);
    }
    
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  toggleUnderline() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    if (range.collapsed) {
      this._toggleInlineFormatAtCursor('underline');
    } else {
      this._toggleInlineFormatRange('underline', range);
    }
    
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  toggleStrikethrough() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    if (range.collapsed) {
      this._toggleInlineFormatAtCursor('strikethrough');
    } else {
      this._toggleInlineFormatRange('strikethrough', range);
    }
    
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  toggleCode() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    const selectedText = range.toString();
    if (!selectedText) return false;
    
    const codeEl = document.createElement('code');
    codeEl.className = 'inline-code';
    codeEl.textContent = selectedText;
    
    range.deleteContents();
    range.insertNode(codeEl);
    range.setStartAfter(codeEl);
    range.collapse(true);
    
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  insertLink(url, text) {
    if (!url || !text) return false;
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    const a = document.createElement('a');
    a.href = url;
    a.className = 'rich-link';
    a.textContent = text;
    
    range.deleteContents();
    range.insertNode(a);
    
    range.setStartAfter(a);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  setTextColor(color) {
    this.exec('foreColor', color);
  }
  
  setHighlight(color) {
    this.exec('hiliteColor', color);
  }
  
  removeFormat() {
    const info = getSelectionInfo();
    if (!info) return false;
    const { sel, range } = info;
    
    const selectedText = range.toString();
    if (!selectedText) return false;
    
    const parent = range.commonAncestorContainer;
    const container = parent.nodeType === Node.TEXT_NODE ? parent.parentElement! : (parent as Element);
    
    const formats = ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code'];
    formats.forEach(tag => {
      const els = container.querySelectorAll(tag);
      els.forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
      });
    });
    
    range.selectNodeContents(container);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  
  _toggleInlineFormatAtCursor(format) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    const node = sel.anchorNode;
    if (!node) return;
    
    const parentInfo = getParentFormatInfo(node, format);
    
    if (parentInfo.active && parentInfo.el) {
      const parent = parentInfo.el;
      const text = parent.textContent;
      const textNode = document.createTextNode(text);
      parent.parentNode.replaceChild(textNode, parent);
      
      const newRange = document.createRange();
      newRange.setStart(textNode, 0);
      newRange.collapse(true);
      range.setStart(textNode, 0);
      range.collapse(true);
    } else {
      const wrapper = document.createElement(this._getTagForFormat(format));
      const textNode = document.createTextNode('\u200B');
      wrapper.appendChild(textNode);
      
      range.insertNode(wrapper);
      
      const newRange = document.createRange();
      newRange.setStart(textNode, 1);
      newRange.collapse(true);
      range.setStart(textNode, 1);
      range.collapse(true);
    }
  }
  
  _toggleInlineFormatRange(format, range) {
    const selectedText = range.toString();
    if (!selectedText) return;
    
    const { startContainer, startOffset, endContainer, endOffset } = range;
    
    const startParent = getParentFormatInfo(startContainer, format);
    const endParent = getParentFormatInfo(endContainer, format);
    
    const startActive = startParent.active || getParentFormatInfo(startContainer, format).active;
    const endActive = endParent.active || getParentFormatInfo(endContainer, format).active;
    
    const isFormatActive = startActive && endActive;
    
    if (isFormatActive) {
      this._unwrapFormatInRange(range, format);
    } else {
      this._wrapRangeWithFormat(range, format);
    }
  }
  
  _unwrapFormatInRange(range, format) {
    const { startContainer, startOffset, endContainer, endOffset } = range;
    const selectedText = range.toString();
    
    const commonAncestor = range.commonAncestorContainer;
    const container = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor;
    
    const tag = this._getTagForFormat(format);
    
    const existingTags = container.querySelectorAll(tag);
    existingTags.forEach(el => {
      const intersects = this._rangesIntersect(
        { node: el, start: 0, end: el.textContent.length },
        { node: startContainer.parentElement, start: startOffset, end: endOffset }
      );
      
      if (intersects) {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
      }
    });
  }
  
  _wrapRangeWithFormat(range, format) {
    const { startContainer, startOffset, endContainer, endOffset } = range;
    const selectedText = range.toString();
    
    const startNode = startContainer.nodeType === Node.TEXT_NODE ? startContainer : startContainer.firstChild;
    const endNode = endContainer.nodeType === Node.TEXT_NODE ? endContainer : endContainer.lastChild;
    
    let [beforeText, startTextNode] = splitTextNode(startNode, startOffset);
    let [endTextNode, afterText] = splitTextNode(endNode, endOffset);
    
    const wrapper = document.createElement(this._getTagForFormat(format));
    const middleText = document.createTextNode(selectedText);
    wrapper.appendChild(middleText);
    
    const parent = startNode.parentElement;
    const startParent = parent;
    
    const before = beforeText ? document.createTextNode(beforeText) : null;
    const after = afterText ? document.createTextNode(afterText) : null;
    
    if (before) startParent.insertBefore(before, startNode);
    startParent.insertBefore(wrapper, startNode);
    if (after) startParent.insertBefore(after, startNode.nextSibling);
    startParent.removeChild(startNode);
    
    const newRange = document.createRange();
    newRange.setStart(middleText, 0);
    newRange.collapse(true);
    
    range.setStart(middleText, 0);
    range.setEnd(middleText, middleText.textContent.length);
  }
  
  _getTagForFormat(format) {
    switch (format) {
      case 'bold': return 'strong';
      case 'italic': return 'em';
      case 'underline': return 'u';
      case 'strikethrough': return 's';
      case 'code': return 'code';
      default: return 'span';
    }
  }
  
  _rangesIntersect(a, b) {
    const { node: formatNode, start: formatStart, end: formatEnd } = a;
    const { node: selNode, start: selStart, end: selEnd } = b;

    if (formatNode === selNode) {
      return !(selEnd <= formatStart || selStart >= formatEnd);
    }

    if (formatNode.contains(selNode)) {
      let selStartOffset = 0;
      let selEndOffset = 0;
      const startTextNode = b.startContainer;
      const endTextNode = b.endContainer;

      const walker = document.createTreeWalker(formatNode, NodeFilter.SHOW_TEXT);
      let currentOffset = 0;
      let foundStart = false;
      let node;
      while ((node = walker.nextNode())) {
        if (node === startTextNode) {
          selStartOffset = currentOffset + (b.startOffset || 0);
          foundStart = true;
        }
        if (node === endTextNode) {
          selEndOffset = currentOffset + (b.endOffset || 0);
          break;
        }
        if (!foundStart) {
          currentOffset += node.textContent.length;
        }
      }

      if (!foundStart && startTextNode) {
        if (formatNode.contains(startTextNode)) {
          selStartOffset = currentOffset + (b.startOffset || 0);
        }
      }

      return !(selEndOffset <= formatStart || selStartOffset >= formatEnd);
    }

    if (selNode.contains(formatNode)) {
      return true;
    }

    return false;
  }
  
  getFormatState() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return { bold: false, italic: false, underline: false, strikethrough: false };
    }
    
    const node = sel.anchorNode;
    if (!node) return { bold: false, italic: false, underline: false, strikethrough: false };
    
    const boldInfo = getParentFormatInfo(node, 'bold');
    const italicInfo = getParentFormatInfo(node, 'italic');
    const underlineInfo = getParentFormatInfo(node, 'underline');
    const strikethroughInfo = getParentFormatInfo(node, 'strikethrough');
    
    return {
      bold: boldInfo.active,
      italic: italicInfo.active,
      underline: underlineInfo.active,
      strikethrough: strikethroughInfo.active
    };
  }
  
  queryState(command) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const node = sel.anchorNode;
    if (!node) return false;
    
    switch (command) {
      case 'bold': return getParentFormatInfo(node, 'bold').active;
      case 'italic': return getParentFormatInfo(node, 'italic').active;
      case 'underline': return getParentFormatInfo(node, 'underline').active;
      case 'strikeThrough': return getParentFormatInfo(node, 'strikethrough').active;
      default: return false;
    }
  }
  
  queryValue(command) {
    return null;
  }
  
  isSupported(command) {
    return true;
  }
}