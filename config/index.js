const path = require('path');

const config = {
    dzy: {
        domain: 'https://www.duozhuayu.com',
        category_path: '/api/categories',
        isbnDataPath: path.join(__dirname, '..', 'data/isbn.json'),
        partIsbnDataPath: path.join(__dirname, '..', 'data/partIsbn.json'),
        exportPath: path.join(__dirname, '..', 'download'),
    },
    category: {
        phone: 1,
        tablet: 2
    },
    /**
     * 返回或设置当前环镜
     */
    env: function () {
        global.$config = this;

        return global.$config;
    }
};

module.exports = config.env();