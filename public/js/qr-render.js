// Renders a styled QR code as an inline SVG.
// Requires the vendored qrcode-generator library (js/vendor/qrcode-generator.js)
// to be loaded first, which exposes the `qrcode` global.
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';

    function roundedSquarePath(x, y, size, r) {
        if (r <= 0) {
            return 'M' + x + ',' + y + 'h' + size + 'v' + size + 'h' + (-size) + 'z';
        }
        var x2 = x + size, y2 = y + size;
        return 'M' + (x + r) + ',' + y +
            'H' + (x2 - r) + 'Q' + x2 + ',' + y + ' ' + x2 + ',' + (y + r) +
            'V' + (y2 - r) + 'Q' + x2 + ',' + y2 + ' ' + (x2 - r) + ',' + y2 +
            'H' + (x + r) + 'Q' + x + ',' + y2 + ' ' + x + ',' + (y2 - r) +
            'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'Z';
    }

    // Renders `text` as a QR code SVG into `container`.
    // options.logo: path to an image shown in the center (forces high error correction
    // so the code stays scannable with a chunk of modules covered).
    function renderQrCode(container, text, options) {
        options = options || {};
        var moduleSize = options.moduleSize || 8;
        var margin = options.margin != null ? options.margin : 3;
        var cornerRadius = moduleSize * 0.3;
        var logo = options.logo || null;

        var qr = window.qrcode(0, logo ? 'H' : 'Q');
        qr.addData(text);
        qr.make();

        var count = qr.getModuleCount();
        var size = (count + margin * 2) * moduleSize;

        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('role', 'img');
        if (options.ariaLabel) svg.setAttribute('aria-label', options.ariaLabel);

        // Reserve a square gap in the middle for the logo so it doesn't get
        // drawn over by modules; error correction level 'H' tolerates this.
        var logoModules = 0, logoStart = 0;
        if (logo) {
            logoModules = Math.ceil(count * 0.22);
            if ((count - logoModules) % 2 !== 0) logoModules += 1;
            logoStart = (count - logoModules) / 2;
        }
        var logoEnd = logoStart + logoModules;

        var d = '';
        for (var row = 0; row < count; row++) {
            for (var col = 0; col < count; col++) {
                if (!qr.isDark(row, col)) continue;
                if (logo && row >= logoStart && row < logoEnd && col >= logoStart && col < logoEnd) continue;
                d += roundedSquarePath((col + margin) * moduleSize, (row + margin) * moduleSize, moduleSize, cornerRadius);
            }
        }

        var modules = document.createElementNS(SVG_NS, 'path');
        modules.setAttribute('d', d);
        modules.setAttribute('class', 'qr-module');
        svg.appendChild(modules);

        if (logo) {
            var logoSize = logoModules * moduleSize;
            var logoPos = (logoStart + margin) * moduleSize;

            var bg = document.createElementNS(SVG_NS, 'rect');
            bg.setAttribute('x', logoPos);
            bg.setAttribute('y', logoPos);
            bg.setAttribute('width', logoSize);
            bg.setAttribute('height', logoSize);
            bg.setAttribute('rx', logoSize * 0.26);
            bg.setAttribute('class', 'qr-logo-bg');
            svg.appendChild(bg);

            var pad = logoSize * 0.16;
            var img = document.createElementNS(SVG_NS, 'image');
            img.setAttribute('href', logo);
            img.setAttribute('x', logoPos + pad);
            img.setAttribute('y', logoPos + pad);
            img.setAttribute('width', logoSize - pad * 2);
            img.setAttribute('height', logoSize - pad * 2);
            svg.appendChild(img);
        }

        container.innerHTML = '';
        container.appendChild(svg);
    }

    window.renderQrCode = renderQrCode;
})();
