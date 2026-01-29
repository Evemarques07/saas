/**
 * ESC/POS Commands for thermal printers
 * Reference: https://reference.epson-biz.com/modules/ref_escpos/index.php
 */

const ESC = 0x1b;
const GS = 0x1d;
const FS = 0x1c;

export const ESCPOS = {
  // Initialization
  INIT: new Uint8Array([ESC, 0x40]), // Reset printer

  // Text alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),

  // Text formatting
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0x00]),

  // Text size
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x20]),
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x30]),

  // Paper control
  LINE_FEED: new Uint8Array([0x0a]),
  CARRIAGE_RETURN: new Uint8Array([0x0d]),

  // Paper cutting
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]),
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  FEED_AND_CUT: new Uint8Array([GS, 0x56, 0x41, 0x03]), // Feed 3 lines then cut

  // Cash drawer
  OPEN_DRAWER_PIN2: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]),
  OPEN_DRAWER_PIN5: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]),

  // Character set
  CHARSET_PC850: new Uint8Array([ESC, 0x74, 0x02]), // Latin characters
  CHARSET_UTF8: new Uint8Array([ESC, 0x74, 0x18]),

  // Code page for Portuguese
  CODEPAGE_CP860: new Uint8Array([ESC, 0x74, 0x03]), // Portuguese

  // Print mode
  FONT_A: new Uint8Array([ESC, 0x4d, 0x00]), // 12x24
  FONT_B: new Uint8Array([ESC, 0x4d, 0x01]), // 9x17 (smaller)
};

// Paper width configurations
export const PAPER_CONFIG = {
  '58mm': {
    charsPerLine: 32,
    maxWidth: 384, // pixels
    dotsPerLine: 384,
  },
  '80mm': {
    charsPerLine: 48,
    maxWidth: 576, // pixels
    dotsPerLine: 576,
  },
};

export type PaperWidth = keyof typeof PAPER_CONFIG;

/**
 * Text encoder for ESC/POS
 */
export class ESCPOSEncoder {
  private buffer: number[] = [];
  private paperWidth: PaperWidth;

  constructor(paperWidth: PaperWidth = '80mm') {
    this.paperWidth = paperWidth;
    this.init();
  }

  private append(data: Uint8Array | number[]): this {
    if (data instanceof Uint8Array) {
      this.buffer.push(...Array.from(data));
    } else {
      this.buffer.push(...data);
    }
    return this;
  }

  init(): this {
    this.buffer = [];
    return this.append(ESCPOS.INIT).append(ESCPOS.CHARSET_PC850);
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const commands = {
      left: ESCPOS.ALIGN_LEFT,
      center: ESCPOS.ALIGN_CENTER,
      right: ESCPOS.ALIGN_RIGHT,
    };
    return this.append(commands[alignment]);
  }

  bold(enabled: boolean = true): this {
    return this.append(enabled ? ESCPOS.BOLD_ON : ESCPOS.BOLD_OFF);
  }

  underline(enabled: boolean = true): this {
    return this.append(enabled ? ESCPOS.UNDERLINE_ON : ESCPOS.UNDERLINE_OFF);
  }

  size(size: 'normal' | 'double-height' | 'double-width' | 'double'): this {
    const commands = {
      normal: ESCPOS.NORMAL_SIZE,
      'double-height': ESCPOS.DOUBLE_HEIGHT,
      'double-width': ESCPOS.DOUBLE_WIDTH,
      double: ESCPOS.DOUBLE_SIZE,
    };
    return this.append(commands[size]);
  }

  text(content: string): this {
    // Convert string to bytes (Latin-1 encoding for thermal printers)
    const bytes = this.encodeText(content);
    return this.append(bytes);
  }

  line(content: string = ''): this {
    return this.text(content).append(ESCPOS.LINE_FEED);
  }

  newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.append(ESCPOS.LINE_FEED);
    }
    return this;
  }

  /**
   * Print a horizontal divider line
   */
  divider(char: string = '-'): this {
    const config = PAPER_CONFIG[this.paperWidth];
    return this.line(char.repeat(config.charsPerLine));
  }

  /**
   * Print a double divider line
   */
  doubleDivider(): this {
    return this.divider('=');
  }

  /**
   * Print two columns (left and right aligned)
   */
  columns(left: string, right: string): this {
    const config = PAPER_CONFIG[this.paperWidth];
    const totalWidth = config.charsPerLine;
    const rightPadded = right.padStart(Math.min(right.length + 1, totalWidth - left.length));
    const line = left + rightPadded.padStart(totalWidth - left.length);
    return this.line(line.substring(0, totalWidth));
  }

  /**
   * Print text centered with padding
   */
  centered(content: string): this {
    return this.align('center').line(content).align('left');
  }

  cut(partial: boolean = false): this {
    return this.newline(3).append(partial ? ESCPOS.CUT_PARTIAL : ESCPOS.CUT_FULL);
  }

  openDrawer(): this {
    return this.append(ESCPOS.OPEN_DRAWER_PIN2);
  }

  /**
   * Encode text to printer-compatible bytes
   * Handles Portuguese characters
   */
  private encodeText(text: string): number[] {
    const bytes: number[] = [];

    // Character mapping for Portuguese
    const charMap: Record<string, number> = {
      'á': 0xa0, 'à': 0x85, 'ã': 0xc6, 'â': 0x83,
      'é': 0x82, 'ê': 0x88, 'í': 0xa1, 'ó': 0xa2,
      'ô': 0x93, 'õ': 0xe4, 'ú': 0xa3, 'ü': 0x81,
      'ç': 0x87, 'Á': 0xb5, 'À': 0xb7, 'Ã': 0xc7,
      'Â': 0xb6, 'É': 0x90, 'Ê': 0xd2, 'Í': 0xd6,
      'Ó': 0xe0, 'Ô': 0xe2, 'Õ': 0xe3, 'Ú': 0xe9,
      'Ç': 0x80, 'º': 0xa7, 'ª': 0xa6,
    };

    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else if (charMap[char]) {
        bytes.push(charMap[char]);
      } else {
        // Fallback: try to use closest ASCII equivalent
        bytes.push(0x3f); // '?'
      }
    }

    return bytes;
  }

  /**
   * Get the final buffer as Uint8Array
   */
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Get buffer length
   */
  get length(): number {
    return this.buffer.length;
  }
}
