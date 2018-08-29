const _ = require('lodash');
const _path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const request = require('superagent');
const xlsx = require('node-xlsx').default;
const sleep = require('js-sleep/js-sleep');
const obj  = xlsx.parse('./file/1.xlsx');
const {getHeader} = require('./util/duozhuayuUtil');
const {formatDate} = require('./util/dateUtil');
const config = require('./config');
const {domain, exportPath, isbnDataPath, partIsbnDataPath} = config.dzy;

let isbnList = [], bookList = [];
Object.keys(obj).forEach(function(key) {
    obj[key].data.forEach(function(item){
        isbnList.push(item[0]);
    });
});

(async() =>{
    await fs.ensureDir(_path.join(isbnDataPath, '..'));
    fs.writeFileSync(isbnDataPath, JSON.stringify(isbnList));
})();

const Cookie = 'fish_c0="2|1:0|10:1535020622|7:fish_c0|24:MjAwMTcyNDU5MTAwNDcyNDg3|372be52f21634d71a889b7654df68ddbeac622d72120cd7db541fcff376c9df9"; _ga=GA1.2.1301324295.1535020276; _gid=GA1.2.1623158148.1535020276';

const getBookInfo = async (isbn) => {
    try {
        console.info(`ISBN: ${isbn} 添加至回收车。`);
        let book = {};
        let result = await request.post(`${domain}/api/user/books`)
            .set(getHeader()).set('Cookie', Cookie).send({"isbn" : isbn});
        result = JSON.parse(result.text);
        if(result){
            book.isbn13             =   isbn;
            book.bookId             =   result.id;
            book.title              =   result.book.title;
            book.authors            =   result.book.author.join(" ");
            book.rawAuthor          =   result.book.rawAuthor;
            book.rate               =   result.rate;
            book.price              =   result.book.price;
            book.originalPrice      =   result.book.originalPrice;
            book.newConditionPric   =   result.book.newConditionPrice;
            book.volumesCount       =   result.book.volumesCount;
            book.doubanRating       =   result.book.doubanRating;
            book.acquirePrice       =   result.acquirePrice;
            book.conversionPrice    =   (result.acquirePrice / 100).toFixed(2);
            book.conditionPrice     =   result.conditionPrice;
            book.images             =   result.book.images.small;
            book.source             =   result.book.source;
            book.binding            =   result.book.binding;
            book.originalTitle      =   result.book.originalTitle;
            book.volumeUnits        =   result.book.volumeUnits.join(" ");
            book.publisher          =   result.book.publisher;
            book.publishDate        =   result.book.publishDate;
            book.created            =   result.book.created;
            book.updated            =   result.book.updated
        }
        return book;
    } catch (e) {
        console.error('getBookInfoError: ', e);
        // 存储爬取到第几个ISBN
        await fs.ensureDir(_path.join(partIsbnDataPath, '..'));
        fs.writeFileSync(partIsbnDataPath, JSON.stringify({isbn: isbn}));
        // 导出已爬取的部分数据
        await executeExcele(bookList);
        return;
    }
};

const delBookInfo = async (bookId) => {
    try {
        await request.delete(`${domain}/api/user/books/${bookId}`)
            .set(getHeader()).set('Cookie', Cookie);
        await console.info(`bookId: ${bookId} 已从回收车删除成功。`);
    } catch (e) {
        console.error('删除失败');
        console.error('delBookInfoError: ', e);
        return e;
    }
};

const getAllBookInfo = async () => {
    try {
        for(let isbn of isbnList){
            await sleep(1000 * 2);
            const book = await getBookInfo(isbn);
            if(_.isEmpty(book)){
                break;
            }
            bookList.push(book);
            if(!_.isEmpty(book)){
                await delBookInfo(book.bookId);
            }
        }
        return bookList;
    } catch (e) {
        console.error('getAllBookInfoError: ', e);
        return [];
    }
};

const getInterruptedIsbn = async () => {
    try {
        const item = JSON.parse(fs.readFileSync(partIsbnDataPath));
        return item.isbn;
    } catch (e) {
        return 0;
    }
};

const getSurplusIsbns = async (isbn, isbnArray) => {
    try {
        let start = false, result = [];
        for(let _isbn of isbnArray){
            if(_isbn === isbn){
                start = true;
            }
            if(start){
                result.push(_isbn);
            }
        }
        isbnList = result;
        console.info('isbnList.size: %d', isbnList.length);
    } catch (e) {
        console.error(e);
        return [];
    }
};

const executeExcele = async (list) =>{
    try {
        if(!list){
            console.info('开始采集数据......');
        }
        // 检测是否出现中断
        const interruptedIsbn = await getInterruptedIsbn();
        if(interruptedIsbn !== 0){
            await getSurplusIsbns(interruptedIsbn, isbnList);
        }

        let books = [];
        const booksTable = [['ISBN', 'bookId', '书籍名称','作者', '原始作者', '价格比率', '价格', '原始价格', '新形势价格', '成交量次数', '豆瓣评分', '购买价格(分)', '转换价格(元)', '形势价格', '封面', '来源', '装订', '原始标题', '体积单位', '出版社', '出版时间', '创建时间', '更新时间']];
        if(!list){
            const books = await getAllBookInfo();
        } else {
            books = list;
        }
        if(_.isEmpty(books)){
            return;
        }
        console.info(`${books.length} 条书籍价格信息`);
        console.info('>>> books: %j', books);
        for(let book of books){
            console.info('>>> book: %j', book);
            let row = [];
            row.push(book.isbn13);
            row.push(book.bookId);
            row.push(book.title);
            row.push(book.authors);
            row.push(book.rawAuthor);
            row.push(book.rate);
            row.push(book.price);
            row.push(book.originalPrice);
            row.push(book.newConditionPric);
            row.push(book.volumesCount);
            row.push(book.doubanRating);
            row.push(book.acquirePrice);
            row.push(book.conversionPrice);
            row.push(book.conditionPrice);
            row.push(book.images);
            row.push(book.source);
            row.push(book.binding);
            row.push(book.originalTitle);
            row.push(book.volumeUnits);
            row.push(book.publisher);
            row.push(book.publishDate);
            row.push(moment(book.created).format('YYYY-MM-DD HH:mm:ss'));
            row.push(moment(book.updated).format('YYYY-MM-DD HH:mm:ss'));
            booksTable.push(row);
        }
        const random = Math.ceil(Math.random() * 1000);
        const currentTime = formatDate(new Date(), 'YYYY-MM-DD-HH');
        const filename = `${exportPath}/dzyBooksPrice-${currentTime}-${random}.xlsx`;
        fs.writeFileSync(filename, xlsx.build([
            {name: '多抓鱼书籍回收价', data: booksTable},
        ]));
        console.log(`爬取结束, 成功导出文件: ${filename}`);
        bookList = [];  // 清空
        return;
    } catch (e) {
        console.error('executeExceleError: ', e);
        return e;
    }
};

const test = async () => {
    try {
        const isbn = "9787208088436";
        const bookId = "217698932564690296";
        const bookInfo = await getBookInfo(isbn);
        console.info('bookInfo: ', bookInfo);
    } catch (e) {
        console.error(e);
        return e;
    }
};


executeExcele();