exports.up = pgm => {
    pgm.addColumns('users', {
        doctorPortfolio: {
            type: 'text',
            comment: 'Портфолио врача (текст, достижения)'
        },
        doctorCertificatesList: {
            type: 'text',
            comment: 'Список сертификатов и курсов'
        },
        doctorServices: {
            type: 'text',
            comment: 'Список услуг врача (краткий)'
        },
        doctorStatusText: {
            type: 'varchar(255)',
            comment: 'Статус (напр. "В зале", "Не в зале")'
        },
        doctorInstagram: {
            type: 'varchar(500)',
            comment: 'Instagram'
        },
        doctorWhatsapp: {
            type: 'varchar(500)',
            comment: 'WhatsApp'
        },
        doctorRating: {
            type: 'decimal(2,1)',
            default: 0,
            comment: 'Рейтинг (0.0 - 5.0)'
        }
    }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('users', [
        'doctorPortfolio',
        'doctorCertificatesList',
        'doctorServices',
        'doctorStatusText',
        'doctorInstagram',
        'doctorWhatsapp',
        'doctorRating'
    ], { ifExists: true });
};