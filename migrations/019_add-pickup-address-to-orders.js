exports.up = pgm => {
    pgm.addColumn('orders', {
        pickupAddress: { type: 'varchar(255)', comment: 'Адрес филиала самовывоза' }
    }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumn('orders', 'pickupAddress', { ifExists: true });
};
