/**
 * 高原國小課表查詢系統設定
 */
const CONFIG = {
    SEMESTERS: {
        '115學年度第一學期': './timetable_115-1.csv',
    },

    // 登入帳密：可自行修改
    USERNAME: 'teacher',
    PASSWORD: 'password123',

    SCHOOL_NAME: '桃園市高原國小',
    SCHOOL_SUBTITLE: '115學年度課表查詢系統',

    // 索引0=早自習；索引1~8=第1~8節
    PERIOD_TIMES: [
        { start: '07:40', end: '08:10', label: '早自習' },
        { start: '08:20', end: '09:05' },
        { start: '09:15', end: '10:00' },
        { start: '10:10', end: '10:55' },
        { start: '11:05', end: '11:50' },
        { start: '13:25', end: '14:10' },
        { start: '14:20', end: '15:05' },
        { start: '15:15', end: '16:00' },
        { start: '16:05', end: '16:50' },
    ],
};
