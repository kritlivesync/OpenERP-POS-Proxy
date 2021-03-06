"use strict";

var escpos = require('node-escpos');

var EscPosPrinter = escpos.EscPosPrinter;
var EscPosDisplay = escpos.EscPosDisplay;

var devPorts = process.argv.splice(2);
if (devPorts[0] === undefined){
    devPorts[0] = "/dev/ttyS0";
}

if (devPorts[1] === undefined){
    devPorts[1] = "/dev/ttyUSB0";
}
var printer = new EscPosPrinter(devPorts[0]);
var poleDisplay = new EscPosDisplay(devPorts[1]);

if (devPorts[2] === undefined){
    devPorts[2] = "Bienvenu";
}

if (devPorts[3] === undefined){
    devPorts[3] = "Welcome";
}
poleDisplay.on("ready", function() {
    console.log('poleDisplay ready.');
    poleDisplay.centeredUpperLine(devPorts[2]);
    poleDisplay.centeredBottomLine(devPorts[3]);
});

if (devPorts[4] === undefined){
    devPorts[4] = "Fermé";
}

if (devPorts[5] === undefined){
    devPorts[5] = "Closed";
}

printer.on("ready", function() {
    console.log('printer ready.');
    //printer.printLine("printLine test");
    //printer.printCentered("printCentered test");
});

var replicate = function(len, char) {
    return Array(len + 1).join(char || ' ');
};

var padr = function(txt, len, char) {
    if (txt.length >= len)
        return txt.substr(0, len);
    return txt + replicate(len - txt.length, char);
};

var padl = function(txt, len, char) {
    if (txt.length >= len)
        return txt.substr(0, len);
    return replicate(len - txt.length, char) + txt;
};

exports.print_receipt = function(req, res) {
    var jsonResponse = {};
    var receipt = {};
    var jsonpData;

    if (req.method === 'GET') {
        if (req.query.r) {
            jsonpData = JSON.parse(req.query.r);
        }
    } else {
        if (req.body.r) {
            jsonpData = JSON.parse(req.body.r);
        }
    }

    if (jsonpData) {
        receipt = jsonpData.params.receipt;
        printer.printCentered(receipt.company['name']);
        var address = receipt.company['contact_address'].split("\n");
        printer.printCentered(address[0]);
        printer.printCentered(address[2]);
        printer.printCentered('Tél.: ' + receipt.company['phone']);
        printer.printCentered(' ');
        var facture = receipt.name.split(" ");
        printer.printLine('FACTURE ' + facture[1]);
        if (receipt.date['month'].toString().length == 1) {
            receipt.date['month'] = "0" + receipt.date['month'];
        }
        if (receipt.date['minute'].toString().length == 1) {
            receipt.date['minute'] = "0" + receipt.date['minute'];
        }
        printer.printLine(receipt.date['date'] + '-' + receipt.date['month'] + '-' + receipt.date['year'] + ' ' + receipt.date['hour'] + ':' + receipt.date['minute']);
        printer.printCentered('------------------------------------------');
        var qteTot = 0;
        var tpsTot = 0;
        var tvqTot = 0;
        for (var i in receipt.orderlines) {
            printer.printLine(padr(receipt.orderlines[i].product_name, 21) + '- Qté ' + receipt.orderlines[i].quantity + padl('$' + receipt.orderlines[i].price_display.toFixed(2), 14));
            qteTot += receipt.orderlines[i].quantity;
            tpsTot += receipt.orderlines[i].tps;
            tvqTot += receipt.orderlines[i].tvq;
        }
        printer.printCentered('------------------------------------------');
        printer.printCentered('SOUS-TOTAL' + padl('$' + receipt.subtotal.toFixed(2), 32));
        printer.printCentered('TPS 5%' + padl('$' + tpsTot.toFixed(2), 36));
        printer.printCentered('TVQ 9,975%' + padl('$' + tvqTot.toFixed(2), 32));
        printer.printCommand('\x1b\x21\x20');
        printer.printCenteredLen('TOTAL' + padl('$' + receipt.total_with_tax.toFixed(2), 7), 21);
        printer.printCommand('\x1b\x21\x00');
        printer.printCentered('Argent' + padl('$' + receipt.total_paid.toFixed(2), 13));
        printer.printCentered('REMISE' + padl('$' + receipt.change.toFixed(2), 13));
        printer.printCentered(' ');
        printer.printLine('Nombre d\'articles: ' + qteTot);
        printer.printCommand('\x1b\x21\x20');
        printer.printCenteredLen('MERCI!', 21);
        printer.printCommand('\x1b\x21\x00');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCentered('==========================================');
        printer.printCentered('TPS: ' + tpsTot.toFixed(2) + ' $    ' + 'TVQ: ' + tvqTot.toFixed(2) + ' $');
        printer.printCommand('\x1b\x21\x20');
        printer.printCenteredLen('Total : ' + receipt.total_with_tax.toFixed(2) + ' $', 21);
        printer.printCommand('\x1b\x21\x00');
        printer.printCentered('PAIMENT REÇU');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCentered(' ');
        printer.printCommand('\x1d\x56\x01'); // Partially cut the paper;
        printer.printCommand('\x1b\x70\x00\x05\x05');
        poleDisplay.centeredUpperLine(devPorts[2]);
        poleDisplay.centeredBottomLine(devPorts[3]);
    }

    //jsonResponse.id = req.query.id;
    jsonResponse = {};
    res.json(jsonResponse);
};

exports.open_cashbox = function(req, res) {
    var jsonpData = JSON.parse(req.query.r);
    //var jsonResponse = {id: jsonpData.params.id};
    var jsonResponse = {};
    res.json(jsonResponse);
};

exports.pole_display = function(req, res) {
    var product;

    if (req.query.r) {
        var jsonpData = JSON.parse(req.query.r);
        product = jsonpData.params.product;
    }

    if (product) {
        if (product.context == "product") {
            poleDisplay.text("\x1b\x40");
            poleDisplay.text(padr(product.product_name, 20));
            poleDisplay.text("\r");
            poleDisplay.text(padl('$' + product.price.toFixed(2), 20));
        } else if (product.context == "payment") {
            poleDisplay.text("\x1b\x40");
            poleDisplay.centeredUpperLine('TOTAL:  ' + '$' + product.total_with_tax.toFixed(2));
        } else if (product == "reload") {
            poleDisplay.centeredUpperLine(devPorts[2]);
            poleDisplay.centeredBottomLine(devPorts[2]);        
        } else if (product == "closed") {
            poleDisplay.centeredUpperLine(devPorts[4]);
            poleDisplay.centeredBottomLine(devPorts[5]);
        }        
    } else {
        if (req.query.line1) {
            poleDisplay.centeredUpperLine(req.query.line1);
        }
        if (req.query.line2) {
            poleDisplay.centeredBottomLine(req.query.line2);
        }
    }


    var jsonResponse = {};
    res.json(jsonResponse);
};

