exports.up = pgm => {
    pgm.createTable('schedule_slots', {
        slotId: { type: 'bigserial', primaryKey: true },
        doctorId: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE', comment: 'Врач' },
        slotDate: { type: 'date', notNull: true, comment: 'Дата' },
        startTime: { type: 'time', notNull: true, comment: 'Время начала' },
        endTime: { type: 'time', notNull: true, comment: 'Время окончания' },
        isAvailable: { type: 'boolean', notNull: true, defaultValue: true, comment: 'Свободен ли слот' },
        clientName: { type: 'varchar(255)', comment: 'Имя клиента (если занят)' },
        clientPhone: { type: 'varchar(20)', comment: 'Телефон клиента' },
        slotNotes: { type: 'text', comment: 'Заметки' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Слоты расписания врачей' });

    pgm.addConstraint('schedule_slots', 'unique_slot', { unique: ['doctorId', 'slotDate', 'startTime'] });
    pgm.createIndex('schedule_slots', 'doctorId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('schedule_slots', { ifExists: true });
};