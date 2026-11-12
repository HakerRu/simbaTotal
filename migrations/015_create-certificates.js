exports.up = pgm => {
    pgm.createTable('certificates', {
        certificateId: { type: 'bigserial', primaryKey: true },
        certificateName: { type: 'varchar(255)', notNull: true, comment: 'Название сертификата' },
        certificateDescription: { type: 'text', comment: 'Описание' },
        issueDate: { type: 'date', comment: 'Дата выдачи' },
        fileUrl: { type: 'varchar(500)', comment: 'URL файла' },
        fileKey: { type: 'varchar(500)', comment: 'Ключ файла' },
        isPublished: { type: 'boolean', notNull: true, defaultValue: true },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Сертификаты клиники' });
};

exports.down = pgm => {
    pgm.dropTable('certificates', { ifExists: true });
};