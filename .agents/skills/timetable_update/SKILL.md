---
name: timetable_update
description: 當使用者要求「更新課表」、「轉換新課表 PDF」或「部署最新課表」時觸發。自動化完成從 PDF 轉檔、前端設定更新到 Firebase 部署的操作流程。
---

# 嘉義國中課表系統更新流程 (Timetable System Update Workflow)

當使用者提供新的課表 PDF 檔案，請依序執行以下標準作業流程 (SOP) 來完成系統的更新與上線部署：

## 1. 放置與確認檔案
- 確認新的課表 PDF 檔案已放置於專案根目錄（例如：`115班級課表0826.pdf`）。

## 2. 更新轉換腳本設定 (`scripts/pdf_to_csv.py`)
- 開啟 `scripts/pdf_to_csv.py`，確認 `__main__` 區塊中包含新 PDF 檔案與目標 CSV 檔名的對應關係：
  ```python
  for pdf_name, csv_name in [
      ('114學年度第一學期班級課表.pdf',    'timetable_s1.csv'),
      ('114學年度第二學期班級課表0205.pdf', 'timetable_s2.csv'),
      ('115年暑期班級課表.pdf',            'timetable_summer.csv'),
      ('115班級課表0826.pdf',              'timetable_s3.csv'),
  ]:
  ```

## 3. 執行資料轉換 (PDF -> CSV & JSON)
- 執行轉檔腳本（需安裝 `pdfplumber` 套件）：
  ```bash
  python scripts/pdf_to_csv.py
  ```
- 轉檔完成後，確認 `public/` 資料夾內已成功產出對應的 `timetable_XXX.csv` 與 `homerooms_XXX.json`。

## 4. 更新前端選單設定 (`public/config.js`)
- 開啟 `public/config.js`，在 `CONFIG.SEMESTERS` 新增新學期的選單項目：
  ```javascript
  SEMESTERS: {
      '114學年度 第一學期': '/timetable_s1.csv',
      '114學年度 第二學期': '/timetable_s2.csv',
      '115年 暑期': '/timetable_summer.csv',
      '115學年度 第一學期': '/timetable_s3.csv',
  },
  ```

## 5. 測試與部署 (Deploy to Firebase Hosting)
- 確認檔案無誤後，執行 Firebase 部署：
  ```bash
  firebase deploy
  ```
  *(若環境未全域安裝 firebase-tools，可使用 `npx -y firebase-tools@latest deploy`)*

## 6. 完成後的回報
- 部署完成後回報線上網址，並提醒使用者若瀏覽器畫面未即時更新，可按 `Ctrl + F5`（或行動裝置重新整理）清除快取。