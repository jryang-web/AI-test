-- 報修登記系統：首次建表腳本，僅供人工審閱後部署；不會取代既有資料表。
-- 此腳本須由具備建表及授權權限的管理角色執行，整體以交易確保原子性。
BEGIN;

-- 建立欄位與預設值：所有欄位必填；識別碼與建立時間由資料庫產生。
-- 文字長度為本設計採用的限制：姓名 100、地點 200、說明 2000 個字元。
-- 長度上限與必填規則尚非需求筆記的既定規格，正式上線前需確認。
CREATE TABLE public.repair_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    reporter_name text NOT NULL,
    location text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    urgency text NOT NULL DEFAULT '中',
    status text NOT NULL DEFAULT '待處理',

    -- CHECK：文字不可只有空白，並限制原始輸入的字元數。
    CONSTRAINT repair_requests_reporter_name_check CHECK (
        reporter_name ~ '[^[:space:]]' AND char_length(reporter_name) BETWEEN 1 AND 100
    ),
    CONSTRAINT repair_requests_location_check CHECK (
        location ~ '[^[:space:]]' AND char_length(location) BETWEEN 1 AND 200
    ),
    CONSTRAINT repair_requests_description_check CHECK (
        description ~ '[^[:space:]]' AND char_length(description) BETWEEN 1 AND 2000
    ),

    -- CHECK：封閉選項集合，同時限制選項欄位只能使用下列固定文字。
    CONSTRAINT repair_requests_category_check CHECK (category IN ('設備', '網路', '環境', '其他')),
    CONSTRAINT repair_requests_urgency_check CHECK (urgency IN ('低', '中', '高')),
    CONSTRAINT repair_requests_status_check CHECK (status IN ('待處理', '處理中', '已完成'))
);

-- GRANT：先移除一般角色可能從預設授權取得的表級權限，再明確採最小授權。
-- 本示範僅使用 anon；authenticated 不在此次開放範圍內。
REVOKE ALL PRIVILEGES ON TABLE public.repair_requests FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.repair_requests TO anon;
GRANT INSERT (reporter_name, location, category, description, urgency)
    ON TABLE public.repair_requests TO anon;
-- 不授予 UPDATE、DELETE 或 TRUNCATE；亦不授予 id、created_at、status 的 INSERT 權限。
-- 新增請求應省略這三個欄位，讓資料庫套用預設值；urgency 可省略以使用「中」。

-- RLS：表級授權與資料列政策必須同時符合，匿名使用者才可存取資料。
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY repair_requests_anon_select
    ON public.repair_requests FOR SELECT TO anon
    USING (true);

-- RLS：匿名新增的最終資料列只能處於「待處理」，作為欄位授權以外的第二道限制。
CREATE POLICY repair_requests_anon_insert
    ON public.repair_requests FOR INSERT TO anon
    WITH CHECK (status = '待處理');
-- 不建立修改或刪除政策；擁有者與 BYPASSRLS 角色不受一般 RLS 保護限制。

COMMIT;
