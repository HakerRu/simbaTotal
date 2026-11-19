exports.up = pgm => {
    pgm.addColumns('users', {
        ordersBlocked: { type: 'boolean', notNull: true, default: false },
        noShowCount: { type: 'integer', notNull: true, default: 0 },
        profileUpdatedAt: { type: 'timestamp with time zone' }
    }, { ifNotExists: true });

    pgm.addColumns('orders', {
        cancelReason: { type: 'varchar(20)' }
    }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('orders', ['cancelReason'], { ifExists: true });
    pgm.dropColumns('users', ['ordersBlocked', 'noShowCount', 'profileUpdatedAt'], { ifExists: true });
};
