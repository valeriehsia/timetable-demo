/**
 * 高原國小課表查詢系統設定
 */
const CONFIG = {
    SEMESTERS: {
        '115學年度第一學期': './timetable_115-1.csv',
    },

    // 登入帳密：可自行修改
    USERNAME: 'gyps',
    PASSWORD: 'gyps115',

    SCHOOL_NAME: '桃園市高原國小',
    SCHOOL_SUBTITLE: '115學年度課表查詢系統',

    // 索引0=早自習；索引1~8=第1~8節
    PERIOD_TIMES: [
    { start: '07:40', end: '08:10', label: '早自習' }, // 早自習
    { start: '08:40', end: '09:20' }, // 第1節
    { start: '09:30', end: '10:10' }, // 第2節
    { start: '10:30', end: '11:10' }, // 第3節
    { start: '11:20', end: '12:00' }, // 第4節
    { start: '13:10', end: '13:50' }, // 第5節
    { start: '14:00', end: '14:40' }, // 第6節
    { start: '14:50', end: '15:30' }, // 第7節
    { start: '——', end: '——' },       // 第8節
    ],
};
