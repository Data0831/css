// --- Start of prompt.js ---
const food_detect = {
    gen_system_prompt: `你的核心任務是：從使用者提供的不同輸入類型中，精確地整合食品相關資訊，最終化為一個標準的 JSON 物件。

**處理流程步驟:**

1.  **接收與判斷輸入:**
    *   你會接收到以下三種可能的輸入組合：
        *   **文字描述:** 一段語音轉譯後的食品相關文字，仔細閱讀並**主動修正**其中可能存在的語音辨識錯誤。
        *   **圖片:** 一張食品相關的圖片。
        *   **文字描述 + 圖片:** 同時提供文字和圖片。

2.  **資訊辨識、提取與智能整合:**
    *   基於所有可用的輸入資訊（修正後的文本和/或圖片），精確辨識並提取以下食品相關資訊：
        *   食品的具體名稱 (\'food_name\')
        *   食品重量及其單位 (\'food_weight\')
        *   食品的入庫日期 (\'food_added_date\')
        *   食品的到期日期 (\'food_expiration_date\')
        *   食品的類型 (\'food_type\')
        *   食品的存放位置 (\'storage_location\')

    *   **智能整合與衝突解決原則 :**
        *   **圖片優先:**
            *   若文字描述與圖片在**食品名稱**或**食品類型**上存在不符，**一律以圖片中展現的資訊為準**。
            *   例如：文字提及 "蘋果"，但圖片顯示 "香蕉"，則 \'food_name\' 應為 "香蕉"，\'food_type\' 應為 "水果"。
        *   **圖片補足:**
            *   若文字描述中某項資訊未明確提及或模糊（例如 "一把菜"），但圖片能清晰識別（例如顯示 "花椰菜"），則使用圖片中的詳細資訊來填充該欄位。
        *   **推斷與估計 (Inference & Estimation):**
            *   在綜合考量所有可用資訊（修正後的文本和圖片）後，如果仍有欄位資訊缺失或無法確定，請你根據常識和上下文進行合理的**自行判斷估計**，確保所有欄位都有值。

3.  **數據轉換與標準化 (Data Conversion & Standardization):**
    *   **食品重量 ('food_weight'):**
        *   將所有識別到的單位轉換為**公克 (g)**，並只保留純數字部分。
        *   如果僅有圖片無明確重量信息，請**合理估計**常見的包裝或單個重量。
    *   **日期資訊 ('food_added_date', 'food_expiration_date'):**
        *   請將所有識別到的日期轉換為 **'YYYY-MM-DD' 格式**。
        *   **務必考慮當前時間 \\'$time\\'** 來解析相對日期描述 (如 "今天", "昨天", "上週五", "明天", "三天後")。
    *   **食品類型 ('food_type'):**
        *   **必須嚴格遵守**下列可選類型。如果描述不符合任何一個類別，請使用 \'"其他"\'。
            *   可選類型: \'["水果", "蔬菜", "全穀雜糧", "蛋肉", "甜品零食飲料", "主食", "廚房調料", "保健食品", "其他"]\'
    *   **存放位置 ('storage_location'):**
        *   **必須嚴格遵守**下列可選位置。
            *   可選位置: \'["冷藏", "冷凍", "已移除"]\'
        *   若無法確定，請預設為 \'"冷藏"\'。

4.  **生成 JSON 物件 (Generate JSON Object):**
    *   將所有提取、修正和標準化後的資訊，格式化成 JSON。
    *   **JSON 結構要求:**
        {
          "food_name": "string",
          "food_weight": "integer", // 估計值，單位為公克
          "food_added_date": "string", // YYYY-MM-DD
          "food_expiration_date": "string", // YYYY-MM-DD
          "food_type": "string", // 來自預定義列表
          "storage_location": "string" // 來自預定義列表
        }
    *   **重要提示：** 確保所有欄位都有合理的值，**不能留空或輸出 "null"**。`,

    schema: {
        type: "OBJECT",
        properties: {
            food_name: { type: "STRING" },
            food_weight: { type: "NUMBER" },
            food_added_date: { type: "STRING" },
            food_expiration_date: { type: "STRING" },
            food_type: { type: "STRING" },
            storage_location: { type: "STRING" }
        },
        required: [
            "food_name",
            "food_weight",
            "food_added_date",
            "food_expiration_date",
            "food_type",
            "storage_location"
        ]
    },
};

const base_nutrients = {
    gen_system_prompt: `您是一位專業的營養數據分析師。請根據我提供的食品圖片和食品資料，提取並生成該食品的營養成分數據。

**任務要求：**
1.  **數據來源：** 主要依賴你的內部知識庫，若有不足則主動進行網路搜尋。
2.  **營養素列表：** **必須** 提取並包含以下所有營養素的數據，順序固定：
    *   蛋白質 (克 / g)
    *   總脂肪 (克 / g)
    *   總碳水化合物 (克 / g)
    *   膳食纖維 (克 / g)
    *   糖 (克 / g)
    *   鈉 (毫克 / mg)
    *   鈣 (毫克 / mg)
    *   鐵 (毫克 / mg)
3.  **數據標準化：**
    *   所有營養素的 \`nutrient_value\` 均應標準化為**每100克 (g) 或每100毫升 (ml) 的份量**。
    *   數值請保留小數點後兩位（若為整數則無需顯示小數點）。
**最終輸出格式要求 (極其嚴格)：**
*   **你的回應必須且僅能是一個JSON陣列。**
*   **絕對禁止** 任何額外文字、解釋、引言、結語或任何其他非JSON格式的內容。
*   請嚴格按照以下範例的完整JSON結構和營養素順序輸出。

\`\`\`json
[
    { "nutrient_name": "蛋白質", "nutrient_value": 0.00 },
    { "nutrient_name": "總脂肪", "nutrient_value": 0.00 },
    { "nutrient_name": "總碳水化合物", "nutrient_value": 0.00 },
    { "nutrient_name": "膳食纖維", "nutrient_value": 0.00 },
    { "nutrient_name": "糖", "nutrient_value": 0.00 },
    { "nutrient_name": "鈉", "nutrient_value": 0 },
    { "nutrient_name": "鈣", "nutrient_value": 0 },
    { "nutrient_name": "鐵", "nutrient_value": 0.00 }
]`,
    schema: {} // 還未定義
};

const special_nutrients = {
    gen_system_prompt: `您是一位專業的營養數據分析師，專精於從食品資料中識別並提取該食物獨有的、對健康有益的特殊營養素。請根據我提供的食品圖片和食品資料，提取並生成該食品的營養成分數據。

**任務要求：**
1.  **數據來源：** 主要依賴您的內部知識庫，若有不足則主動進行網路搜尋，確保數據的準確性與權威性。
2.  **營養素列表：**
    *   **絕對禁止包含以下9種營養素：** 熱量 (大卡 / kcal)、蛋白質 (克 / g)、總脂肪 (克 / g)、總碳水化合物 (克 / g)、膳食纖維 (克 / g)、糖 (克 / g)、鈉 (毫克 / mg)、鈣 (毫克 / mg)、鐵 (毫克 / mg)。
    *   **必須** 提取並包含該食品中 **6種(必須剛好6種)** 對健康有益且在該食物中含量相對突出、具代表性或具特定功能性的「特殊營養素」。
    *   這些特殊營養素應包含但不限於：特定維生素 (如維生素A、C、D、E、K、B群維生素等，排除前述已禁的營養素)、特定礦物質 (如鉀、鎂、鋅、硒、碘、銅、錳等，排除前述已禁的營養素)、抗氧化劑 (如多酚、花青素、類胡蘿蔔素、兒茶素等)、生物活性植化素、酵素等。
    *   請根據這些特殊營養素的重要性或含量高低，自行判斷輸出順序。
3.  **數據標準化：**
    *   所有營養素的 \`nutrient_value\` 均應標準化為**每100克 (g) 或每100毫升 (ml) 的份量**。
    *   數值請保留小數點後兩位（若為整數則無需顯示小數點）。
    *   單位應正確標示，例如毫克(mg)、微克(µg) 等。

**最終輸出格式要求 (極其嚴格)：**
*   **您的回應必須且僅能是一個JSON陣列。**
*   **絕對禁止** 任何額外文字、解釋、引言、結語或任何其他非JSON格式的內容。
*   請嚴格按照以下範例的完整JSON結構輸出：

\`\`\`json
[
    { "nutrient_name": "維生素C", "nutrient_value": 0.00 },
    { "nutrient_name": "花青素", "nutrient_value": 0.00 },
    { "nutrient_name": "鉀", "nutrient_value": 0.00 },
    { "nutrient_name": "硒", "nutrient_value": 0.00 },
    { "nutrient_name": "槲皮素", "nutrient_value": 0.00 }
]\`\`\``,
};

const nutrient_definition = {
    gen_system_prompt: "你是一位專業的營養學家，請根據營養素名稱提供其標準單位和簡潔描述。你的回應必須是純淨的 JSON 陣列。",
    schema: {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                nutrient_name: { type: "STRING" },
                nutrient_unit: { type: "STRING" },
                nutrient_desc: { type: "STRING" }
            },
            required: ["nutrient_name", "nutrient_unit", "nutrient_desc"]
        }
    }
};

const food_suggestion = {
    gen_system_prompt: `你是一位全方位的食品專家與生活顧問。你的核心任務是根據使用者提供的foodData, foodContents 食物資料中，閱讀並生成相對應的結構化 JSON 物件。

**輸入資訊:**
你會接收到 foodData, foodContents 兩個 JSON 物件，用於參考並生成建議：
*  ** 'nutritional_value':**
    *   這是食物每 100g 含有之對應營養素數值。
*  ** 'realValue':**
    *   這是食物總重量含有之對應營養素數值，可能與 'nutritional_value' 有所不同。

請根據 foodData, foodContents 與妳的判斷，生成一個 JSON 物件，其鍵 (key) 必須精確對應以下 \`suggestion_type\`，內容則為該 \`suggestion_type\` 的 \`suggestion_content\`：

1.  **\`safety_warning\` (食品安全警告 - string):**
    *   提供與該食品相關的關鍵食品安全注意事項。例如：清洗建議、避免交叉污染、適當的烹飪溫度、快速冷藏要求，或若過期日臨近的提示。
    *   務必簡潔明確，以保護使用者健康為優先。

2.  **\`handling_advice\` (處理建議 - string):**
    *   提供食品在烹飪前或使用前的具體處理步驟。例如：如何清洗、切割、解凍、去皮、去籽等。
    *   應具體且實用。

3.  **\`recipe_idea\` (食譜建議 - string):**
    *   提供一個簡單、實用且易於執行的食譜建議，突出該食品的風味或最佳用途。可以是主菜、配菜、點心或飲品的靈感。
    *   內容應簡短，著重於料理概念，無需詳細步驟。

4.  **\`storage_tip\` (儲存建議 - string):**
    *   根據 \`storage_location\` 參考值，提供最佳的儲存方法以延長食品保鮮期。
    *   包括：儲存溫度、容器選擇、是否需要密封、以及大致的儲存時長（若無 \`food_expiration_date\` 可用則提供通用估計）。
    *   應連結到該食品的特性（例如：水果蔬菜是否需冷藏，肉類是否可冷凍）。

5.  **\`nutritional_insight\` (營養洞察 - string):**
    *   基於 \`nutritional_data\` 提供的營養成分，簡要分析該食品的營養價值和對健康的益處。例如：富含蛋白質、膳食纖維、維生素、低脂等。
    *   若無 \`nutritional_data\`，則根據 \`food_name\` 或 \`food_type\` 提供常見的營養優勢。

6.  **\`pairing_suggestion\` (搭配建議 - string):**
    *   提供該食物適合搭配的飲品、食材或菜餚，以提升風味、營養均衡或創造新的飲食體驗。

7.  **\`serving_guidance\` (食用份量建議 - string):**
    *   提供該食物建議的單次食用份量或每日攝取量，並可說明特殊人群（如兒童、老年人、糖尿病患者）的調整建議。

8.  **\`drug_interaction\` (藥物交互作用 - string):**
    *   簡要說明該食物與常見藥物（若有）的潛在交互作用，或特殊健康狀況下（如腎臟病、痛風等）需要特別注意的事項。若無已知交互作用，請說明。

9.  **\`other\` (其他建議 - string):**
    *   提供任何其他有用、有趣或相關的補充資訊。例如：環保小貼士、選購技巧、或不常見的用途等。

**最終輸出要求:**
*   **你的回應必須且只能是一個完整的 JSON 物件。**
*   **絕對禁止任何額外文字、語句、解釋或格式。** 僅輸出以下完整 JSON 結構。
*   所有欄位都必須是有效的字符串，**不能為空或輸出 "null"**。如果某項資訊無法提供或不適用（例如某食物沒有已知的藥物交互作用），請填寫簡短的「無」、「不適用」或「未發現已知交互作用」等字樣。
*   範例 JSON 結構:
    \`\`\`json
    [
        {"safety_warning": "string"},
        {"handling_advice": "string"},
        {"recipe_idea": "string"},
        {"storage_tip": "string"},
        {"nutritional_insight": "string"},
        {"pairing_suggestion": "string"},
        {"serving_guidance": "string"},
        {"drug_interaction": "string"},
        {"other": "string"}
    ]
    \`\`\``,
}
const smart_replacement = {
    gen_system_prompt: `你是一位專業的營養師和數據科學家。你的任務是根據使用者提供的原始食物資料（foodContents），找出一個營養上更優或更健康的替代品，並生成一個結構化的 JSON 物件來對比兩者。

**輸入資訊:**
你會接收到一個名為 \`foodContents\` 的 JSON 物件，其中包含原始食物的名稱、基本營養素和特殊營養素等詳細資料。

**核心任務與處理流程:**

1.  **分析原始食物:**
    *   深入分析 \`foodContents\` 中的營養數據，理解其營養特點（例如：高糖、高纖維、富含維生素C等）。

2.  **尋找最佳替代品:**
    *   基於對原始食物的分析，從你的知識庫中尋找一個**單一的、更健康的替代品**。
    *   **選擇標準:** 替代品應在某些關鍵營養素上表現更優（例如：糖分更低、蛋白質更高、富含不同的有益維生素等）。

3.  **選擇對比維度:**
    *   從原始食物和替代品中，精心挑選 **2 到 4 個** 最具代表性或差異最顯著的營養素進行對比。
    *   對比的維度應能突顯替代品的優勢。例如，如果用藍莓替代蘋果，可以對比「糖」和「花青素」。

4.  **生成對比數據:**
    *   為原始食物和替代品，生成所選對比維度的營養數值。
    *   所有數值都應標準化為**每 100g** 的含量，並包含單位（g, mg, µg 等）。

**最終輸出格式要求 (極其嚴格):**

*   **你的回應必須且僅能是一個 JSON 物件。**
*   **絕對禁止** 任何額外文字、解釋、引言、結語或任何其他非JSON格式的內容。
*   請嚴格按照以下範例的完整 JSON 結構輸出。

\`\`\`json
{
  "original": {
    "name": "原始食物名稱",
    "nutrients": [
      { "label": "營養素A", "value": "10g" },
      { "label": "營養素B", "value": "5mg" }
    ]
  },
  "replacement": {
    "name": "替代品名稱",
    "nutrients": [
      { "label": "營養素A", "value": "5g" },
      { "label": "營養素B", "value": "15mg" }
    ]
  }
}
\`\`\`
`
};
// --- End of prompt.js ---

// --- Start of alert.js ---
const AlertSystem = {
    container: null,
    alerts: [],
    currentPosition: null,

    /**
     * 確保 container 屬性指向當前頁面中有效的警報容器元素，並設定其位置。
     * @param {string} position - 警報容器的位置 ('top-right' 或 'top-center')。
     * @private
     */
    _ensureContainer(position) {
        if (!this.container) {
            this.container = document.getElementById('alert-container');
        }
        // 如果容器存在，且請求的位置與當前不同，則更新 class
        if (this.container && this.currentPosition !== position) {
            this.container.classList.remove('top-right', 'top-center');
            this.container.classList.add(position);
            this.currentPosition = position;
        }
    },

    /**
     * 顯示一則可客製化的警報訊息。
     * @param {string} message - 要顯示的訊息。
     * @param {object} [options={}] - 客製化選項。
     * @param {string} [options.position='top-center'] - 顯示位置 ('top-right' 或 'top-center')。
     * @param {string} [options.textColor] - 文字顏色。若不提供，則使用 CSS 預設值。
     * @param {string} [options.backgroundColor] - 背景顏色。若不提供，則使用 CSS 預設值。
     */
    showAlert(message, { position = 'top-center', textColor, backgroundColor } = {}) {
        this._ensureContainer(position);

        if (!this.container) {
            alert(message);
            console.error('[AlertSystem] showAlert: 找不到警報容器 (alert-container)。訊息: ', message);
            return;
        }

        if (this.alerts.length >= 5) {
            this.removeAlert(this.alerts[0]);
        }

        const alertEl = document.createElement('div');
        alertEl.className = 'alert';
        alertEl.textContent = message;

        // 僅在提供時才應用客製化顏色，否則由 CSS 控制
        if (textColor) {
            alertEl.style.color = textColor;
        }
        if (backgroundColor) {
            alertEl.style.backgroundColor = backgroundColor;
        }

        this.container.appendChild(alertEl);
        this.alerts.push(alertEl);

        setTimeout(() => {
            alertEl.classList.add('show');
        }, 10);

        setTimeout(() => {
            this.removeAlert(alertEl);
        }, 2000);
    },

    /**
     * 移除指定的警報元素。
     * @param {HTMLElement} alertEl - 要移除的警報 DOM 元素。
     */
    removeAlert(alertEl) {
        if (!alertEl || !alertEl.parentNode) {
            this.alerts = this.alerts.filter(a => a !== alertEl);
            return;
        }

        alertEl.classList.add('hide');

        // 等待 CSS 動畫 (0.4s) 結束後再從 DOM 中移除
        setTimeout(() => {
            if (alertEl.parentNode) {
                alertEl.parentNode.removeChild(alertEl);
            }
            this.alerts = this.alerts.filter(a => a !== alertEl);
        }, 400);
    }
};
// --- End of alert.js ---

// --- Start of loading.js ---
const LoadingSystem = {
    container: null,
    loadingElement: null,

    /**
     * 確保 container 屬性指向當前頁面中有效的載入容器元素。
     * @private
     */
    _ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById('loading-container');
        }
    },

    /**
     * 顯示一個載入指示器。
     * @param {string} [message='Loading...'] - 要顯示的訊息。
     */
    showLoading(message = 'Loading...') {
        this._ensureContainer();

        if (!this.container) {
            console.error('[LoadingSystem] showLoading: 找不到載入容器 (loading-container)。');
            return;
        }

        // 如果已經存在，先清除舊的，避免重複
        if (this.loadingElement) {
            // 直接呼叫 hideLoading 可能會導致非預期的延遲，這裡直接清除
            this.container.innerHTML = '';
            this.loadingElement = null;
        }

        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'loading-box';

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'loading-dots';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dotsContainer.appendChild(dot);
        }

        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = message;

        this.loadingElement.appendChild(dotsContainer);
        this.loadingElement.appendChild(text);
        this.container.appendChild(this.loadingElement);

        // 使用 timeout 確保 DOM 更新後再添加 'show' class 以觸發動畫
        setTimeout(() => {
            if (this.container) {
                this.container.classList.add('show');
            }
        }, 10);
    },

    textModify(message) {
        if (this.loadingElement) {
            this.loadingElement.querySelector('.loading-text').textContent = message;
        }else {
            log('[LoadingSystem] textModify: 載入元素尚未初始化', message);
        }
    },

    /**
     * 隱藏載入指示器。
     */
    hideLoading() {
        this._ensureContainer();
        
        if (this.container && this.container.classList.contains('show')) {
            this.container.classList.remove('show');
            
            // 等待 CSS 過渡動畫結束後再移除元素
            setTimeout(() => {
                if (this.loadingElement && this.container) {
                    this.container.innerHTML = ''; // 清空容器
                    this.loadingElement = null;
                }
            }, 400); // 對應 CSS 中的 transition-duration
        }
    }
};
// --- End of loading.js ---

// --- Start of voice.js ---
const Voice = {
    _voicePopupOverlay: null,
    _ensureVoicePopup() {
        if (!this._voicePopupOverlay)
            this._voicePopupOverlay = document.getElementById('voice-popup-overlay');
    },
    openPopup() {
        this._ensureVoicePopup();
        if (this._voicePopupOverlay)
            this._voicePopupOverlay.classList.add('active');
        else
            console.error('voicePopupOverlay not found');
    },

    closePopup() {
        this._ensureVoicePopup();
        if (this._voicePopupOverlay)
            this._voicePopupOverlay.classList.remove('active');
        else
            console.error('voicePopupOverlay not found');
    }
}
// --- End of voice.js ---

// --- Start of func.js ---
// console.log('%c這是綠色文字', 'color: green');
// console.log('%c這是藍色文字', 'color: blue');
// console.log('%c這是紅色文字', 'color: red');
// console.log('%c這是黃色文字', 'color: yellow');
function log(...args) {
    console.log('%c┌─ MY LOG ─────────────────', 'color: #00ff00; font-weight: bold;');
    console.log('%c│', 'color: #00ff00;', ...args);
    console.log('%c└────────────────────────────', 'color: #00ff00; font-weight: bold;');
}


function handleRequestError(error) {

    if (error?.response) {
        const { status } = error.response;
        const message = {
            400: '請求參數錯誤 (400 Bad Request)',
            404: '找不到資源 (404 Not Found)',
            429: '請求過於頻繁，請稍後再試 (429 Too Many Requests)',
        }[status] || `伺服器錯誤 (${status})`;
        AlertSystem.showAlert(`HTTP 錯誤 ${status}: ${message}`);
        console.error(`[Func] handleRequestError: HTTP 錯誤 ${status}`, message);
    } else if (error?.request) {
        AlertSystem.showAlert('無法連線到伺服器，請檢查網路。');
        console.error('[Func] handleRequestError: 無法連線到伺服器', error.request);
    } else {
        AlertSystem.showAlert(`發生未知錯誤：${error.message}`);
        console.error('[Func] handleRequestError: 發生未知錯誤', error);
    }
    throw error;
}

/**
 * 清除 json 中的 ```json 和 ``` 符號
 *
 * @returns {JSON} 一個JSON 物件
 */
function textToJsonStructure(jsonString) {
    // 移除 ```json``` 和所有反引號
    let result = jsonString.replace(/([\s\S]*?)```json\s*|\s*```$/g, '').trim();
    try {
        return JSON.parse(result);
    } catch (error) {
        console.error('[Func] textToJsonStructure: JSON 解析錯誤', error);
        console.error("[Func] textToJsonStructure: 解析前的原始字串", jsonString);
        console.error("[Func] textToJsonStructure: 解析後的結果字串", result);
    }
}

async function getBase64FromUrl(imageUrl) {
    try {
        let blob;
        if (imageUrl.startsWith('file://')) {
            // Use XMLHttpRequest for local files, as it often has different security policies in WebViews.
            blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', imageUrl, true);
                xhr.responseType = 'blob';
                xhr.onload = () => {
                    // status 0 for local files in some environments
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`XHR error! status: ${xhr.status}`));
                    }
                };
                xhr.onerror = () => reject(new Error('XHR request failed for ' + imageUrl));
                xhr.send();
            });
        } else {
            // Existing fetch logic for http/https URLs
            const response = await fetch(imageUrl, {
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) { // 檢查 HTTP 狀態碼
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            blob = await response.blob();
        }

        // blob 是二進位資料，需要轉換為 base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[Func] getBase64FromUrl: 圖片轉換為 Base64 失敗', error);
        throw error;
    }
}

async function getBase64Data(imageUrl) {
    try {
        if (!imageUrl) {
            throw new Error("圖片 URL 不能為空");
        }
        let base64Image = await getBase64FromUrl(imageUrl);
        return base64Image.split(';base64,')[1];
    } catch (error) {
        console.error('[Func] getBase64Data: 獲取 Base64 圖片數據失敗', error);
        throw error;
    }
}

function testStr() {
    return "這是測試字串";
}
// --- End of func.js ---

// --- Start of calorie.js ---
const Calorie = {
    calCalorie_100g(baseNutrients) {
        const factor = { '蛋白質': 4, '總碳水化合物': 4, '總脂肪': 9 };

        return baseNutrients.reduce((total, { nutrient_name, nutrient_value }) => {
            const multi = factor[nutrient_name];
            if (!multi) return total;               // 該營養素不計熱量

            const gram = parseFloat(nutrient_value);
            if (isNaN(gram)) return total;          // 無效數字則忽略

            return total + gram * multi;
        }, 0);
    },

    calCalorie(baseNutrients, food_weight = 100) {
        const totalCalories = Number(baseNutrients?.[0]?.value).toFixed(1);
        if (food_weight === 100) return totalCalories;
        return (totalCalories * food_weight / 100).toFixed(1);
    },

    calCaloriePercentage(baseNutrients) {
        const factor = { '蛋白質': 4, '總碳水化合物': 4, '總脂肪': 9 };
        const percentages = {};

        if (baseNutrients?.length === 9) {
            const totalCalories = Number(baseNutrients[0].nutrient_value).toFixed(1);
            baseNutrients.forEach(({ nutrient_name, nutrient_value }) => {
                const gram = parseFloat(nutrient_value);
                if (isNaN(gram)) return; // 無效數字則忽略

                const calorie = gram * factor[nutrient_name];
                percentages[nutrient_name] = (calorie / totalCalories * 100).toFixed(1);
            });

            if (percentages['蛋白質'] + percentages['總碳水化合物'] + percentages['總脂肪'] <= 0) console.error("[Calorie] calCaloriePercentage: 生成失敗，因為主要營養素總和為 0");

            return {
                protein: percentages['蛋白質'],
                carb: percentages['總碳水化合物'],
                fat: percentages['總脂肪']
            };
        }
        console.error("[Calorie] calCaloriePercentage: 生成失敗，因為基礎營養素長度不為 9");

        return {
            protein: 0,
            carb: 0,
            fat: 0
        };
    },
}

// --- End of calorie.js ---

// --- Start of chart.js ---
const showNutrientNames = ['熱量', '蛋白質', '脂肪', '碳水', '纖維', '糖', '鈉', '鈣', '鐵'];
const ChartManager = {

    /**
     * 獲取 Canvas 2D 上下文並處理未找到元素的情況。
     * @param {string} elementId - Canvas 元素的 ID。
     * @param {string} chartName - 圖表名稱，用於警告訊息。
     * @returns {CanvasRenderingContext2D | null} Canvas 2D 上下文或 null。
     */
    _getChartContext(elementId, chartName) {
        const canvas = document.getElementById(elementId);
        if (!canvas) {
            console.error(`[ChartManager] _getChartContext: 找不到 Canvas 元素 (ID: '${elementId}')，無法繪製 ${chartName}`);
            return null;
        }
        return canvas.getContext('2d');
    },

    /**
     * 銷毀已存在的 Chart.js 圖表實例。
     * @param {HTMLCanvasElement} canvasElement - Canvas DOM 元素。
     */
    _destroyExistingChart(canvasElement) {
        const existingChart = Chart.getChart(canvasElement);
        if (existingChart) {
            existingChart.destroy();
        }
    },

    initMacroDonutChart(foodContents) {
        if (!foodContents?.value?.caloriePercentage || !foodContents?.value?.caloriePercentage === 0) {
            log(`[ChartManager] initMacroDonutChart: 沒有可用的熱量百分比數據`,  foodContents);
            return;
        }

        const ctxDonut = this._getChartContext('macroDonutChart', '甜甜圈圖');
        if (!ctxDonut) {
            return;
        }

        this._destroyExistingChart(ctxDonut.canvas);
        const carbPercentage = foodContents.value.caloriePercentage.carb;
        const proteinPercentage = foodContents.value.caloriePercentage.protein;
        const fatPercentage = foodContents.value.caloriePercentage.fat;

        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: ['蛋白質', '碳水', '脂肪'],
                datasets: [{
                    data: [proteinPercentage, carbPercentage, fatPercentage],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // 仿照參考範例的樣式
                plugins: {
                    legend: {
                        display: false // 仿照參考範例，隱藏圖例
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            // 仿照參考範例，在提示中顯示百分比
                            label: (c) => `${c.label}: ${c.parsed.toFixed(1)}%`
                        }
                    }
                }
            }
        };
        new Chart(ctxDonut, chartConfig);
    },

    initCompositionRadarChart(foodContents, mealMode, elementId = 'baseNutrientRadarChart') {
        let nutrients = [];
        let nutrientLabels = showNutrientNames;

        if (elementId === 'baseNutrientRadarChart') {
            if (!foodContents?.value?.base || foodContents?.value?.base?.length === 0) {
                log(`[ChartManager] initCompositionRadarChart: 沒有可用的基礎營養素數據`);
                return;
            }
            nutrients = foodContents.value.base;
        } else if (elementId === 'specialNutrientRadarChart') {
            if (!foodContents?.value?.special || foodContents?.value?.special?.length === 0) {
                log(`[ChartManager] initCompositionRadarChart: 沒有可用的特殊營養素數據`);
                return;
            }
            nutrients = foodContents.value.special;
            nutrientLabels = nutrients.map(nutrient => nutrient.nutrient_name);
        } else {
            console.error(`[ChartManager] initCompositionRadarChart: 未知的元素 ID '${elementId}'`);
            return;
        }

        const ctx = this._getChartContext(elementId, '成分評估雷達圖');
        if (!ctx) return;

        this._destroyExistingChart(ctx.canvas);
        const dataValues = [];
        const idealPercentage = 33;
        let totalNutrientScore = 0;
        let nutrientCount = 0;
        
        

        nutrients.forEach((nutrient, _) => {
            if (nutrient && nutrient.nutrient_dv > 0) {
                // 用於渲染圖表的 DV，根據 mealMode 動態變化
                const displayDv = mealMode.value ? nutrient.nutrient_dv / 3 : nutrient.nutrient_dv;
                const displayPercentage = Math.round((nutrient.showValue / displayDv) * 100);
                dataValues.push(Math.min(displayPercentage, 100));

                // 用於計算分數的 DV，固定為單餐
                const scoreDv = nutrient.nutrient_dv / 3;
                const scorePercentage = Math.round((nutrient.nutrient_value / scoreDv) * 100);

                const deviation = Math.abs(scorePercentage - idealPercentage);
                const nutrientScore = Math.max(0, 100 - deviation);
                totalNutrientScore += nutrientScore;
                nutrientCount++;
            } else {
                dataValues.push(0);
            }
        });

        // 僅在處理基礎營養素圖表時，才計算並賦值均衡分數
        if (elementId === 'baseNutrientRadarChart') {
            if (nutrientCount > 0) {
                const averageScore = Math.round(totalNutrientScore / nutrientCount);
                if (foodContents.value.base) {
                    foodContents.value.base.score = averageScore;
                }
            } else {
                if (foodContents.value.base) {
                    foodContents.value.base.score = 0;
                }
            }
        }

        const radarOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    pointLabels: { font: { size: 12 } },
                    ticks: {
                        stepSize: 25,
                        callback: value => value + '%'
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        };

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: nutrientLabels,
                datasets: [{
                    label: '食物成分評分',
                    data: dataValues,
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(76, 175, 80, 1)',
                }]
            },
            options: radarOptions
        });
    }
};
// --- End of chart.js ---

// --- Start of datetime.js ---
const DateTime = {
    formatDate(dateTimeStr) {
        return dateTimeStr.split('T')[0];
    },

    formatDateTime(dateTimeStr) {
        const result = dateTimeStr.split('T');
        return result[0] + ' ' + result[1].split('.')[0];
    },

    getCurrentDateTime() {
        return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    },

    getCurrentDate() {
        return this.getCurrentDateTime().split(' ')[0];
    },

    getExpirationDay(food_expiration_date) {
        const daysLeft = (new Date(food_expiration_date) - new Date()) / (1000 * 60 * 60 * 24);
        return Math.max(-1, Math.round(daysLeft));
    },

    formatExpirationStatus(food_expiration_day) {
        const expirationDay = Number(food_expiration_day);
        if (expirationDay > 0) {
            return `${expirationDay} 天`;
        } else if (expirationDay == 0) {
            return `今天最後期限`;
        } else {
            return `已過期`;
        }
    }
};

// --- End of datetime.js ---

// --- Start of progressbar.js ---
const createProgressBar = (elementId, value, maxValue, color) => {
    const bar = document.getElementById(elementId);
    if (!bar) {
        console.error(`[ProgressBar] createProgressBar: 找不到 ID 為 "${elementId}" 的元素`);
        return;
    }

    let width = 0;
    if (maxValue > 0) {
        width = (value / maxValue) * 100;
    }

    width = Math.max(0, Math.min(100, width)); // 確保寬度在 0-100% 之間

    bar.style.width = width + '%';
    bar.style.backgroundColor = color;
};

const ExpirationBar = {
    init(food) {
        const dataList = food.value;
        if ('length' in dataList === false) {
            this.render(0, dataList);
            return;
        }

        if (dataList.length === 0) {
            throw new Error('ExpirationBar refreshAll error: dataList is empty.');
        }

        for (let i = 0; i < dataList.length; i++) {
            this.render(i, dataList[i]);
        }
    },

    render(index, foodItem) {
        const expirationDay = Number(foodItem.food_expiration_day);
        const expiraionBars = document.getElementsByClassName('expiraion-bar');
        const expirationDayGrids = document.getElementsByClassName('expiration-date-container');

        if (!expiraionBars[index]) {
            throw new Error(`ExpirationBar render error: Element not found at index ${index}`);
        }

        if (!expirationDayGrids[index]) {
            throw new Error(`expirationDayGrids render error: Element not found at index ${index}`);
        }

        const expirationDayGrid = expirationDayGrids[index];
        const expiraionBar = expiraionBars[index];

        let width = expirationDay * 7;
        if (width > 100) width = 100;
        else if (width < 0) width = 100;
        expiraionBar.style.width = width + '%';

        expiraionBar.classList.remove('bg-green', 'bg-yellowgreen', 'bg-orange', 'bg-red');
        expirationDayGrid.classList.remove('text-green', 'text-yellowgreen', 'text-orange', 'text-red');

        if (expirationDay > 14) {
            expiraionBar.classList.add('bg-green');
            expirationDayGrid.classList.add('text-green');
        } else if (expirationDay > 7) {
            expiraionBar.classList.add('bg-yellowgreen');
            expirationDayGrid.classList.add('text-yellowgreen');
        } else if (expirationDay > 3) {
            expiraionBar.classList.add('bg-orange');
            expirationDayGrid.classList.add('text-orange');
        } else if (expirationDay > 0) {
            expiraionBar.classList.add('bg-red');
            expirationDayGrid.classList.add('text-red');
        }
    },
};
const ExpirationStatusAlert = {
    init(food) {
        const dataList = food.value;
        if ('length' in dataList === false) {
            this.render(0, dataList);
            return;
        }

        if (dataList.length === 0) {
            throw new Error('ExpirationStatusAlert refreshAll error: dataList is empty.');
        }

        for (let i = 0; i < dataList.length; i++) {
            this.render(i, dataList[i]);
        }
    },

    render(index, foodItem) {
        const expirationDay = Number(foodItem.food_expiration_day);
        const expirationDate = DateTime.formatDate(foodItem.food_expiration_date);

        const statusAlerts = document.getElementsByClassName('status-alert');
        const statusAlertTexts = document.getElementsByClassName('status-alert-text');
        const statusAlertIcons = document.getElementsByClassName('status-alert-icon');

        if (!statusAlerts[index] || !statusAlertTexts[index] || !statusAlertIcons[index]) {
            throw new Error(`ExpirationStatusAlert render error: Element not found at index ${index}`);
        }

        const statusAlert = statusAlerts[index];
        const statusAlertText = statusAlertTexts[index];
        const statusAlertIcon = statusAlertIcons[index];

        // Reset classes
        statusAlert.classList.remove('status-green', 'status-yellowgreen', 'status-orange', 'status-red', 'status-gray');

        let alertText, alertClass, alertIcon;

        if (expirationDay > 14) {
            alertClass = 'status-green';
            alertText = '狀態良好，可安心食用';
            alertIcon = 'check_circle_outline';

        } else if (expirationDay > 7) {
            alertClass = 'status-yellowgreen';
            alertText = '狀態尚可，建議儘快食用';
            alertIcon = 'info';

        } else if (expirationDay > 3) {
            alertClass = 'status-orange';
            alertText = '即將過期，請盡快食用';
            alertIcon = 'warning_amber';
        } else if (expirationDay > 0) {
            alertClass = 'status-red';
            alertText = `警告：此食物將於 ${expirationDate} 過期`;
            alertIcon = 'error_outline';
        } else {
            alertClass = 'status-gray';
            alertText = `此食物已於 ${expirationDate} 過期`;
            alertIcon = 'dangerous';
        }

        statusAlert.classList.add(alertClass);
        statusAlertText.textContent = alertText;
        statusAlertIcon.textContent = alertIcon;
    }
};
const NutrientBar = {
    colors: [
        'bg-nutrient-1', 'bg-nutrient-2', 'bg-nutrient-3',
        'bg-nutrient-4', 'bg-nutrient-5', 'bg-nutrient-6',
        'bg-nutrient-7', 'bg-nutrient-8', 'bg-nutrient-9'
    ],

    init(nutrient, className) {
        if (!nutrient || !Array.isArray(nutrient) || nutrient.length === 0) {
            log(`[NutrientBar] init: '${className}' 的營養數據無效`);
            return;
        }

        const nutrientBars = document.getElementsByClassName(className);
        if (!nutrientBars || nutrientBars.length === 0) {
            console.error(`[NutrientBar] init: 找不到 class 為 '${className}' 的元素`);
            return;
        }

        if (nutrientBars.length !== nutrient.length) {
            console.error(`[NutrientBar] init: DOM 元素數量 (${nutrientBars.length}) 與數據長度 (${nutrient}) 不匹配`);
            return;
        }

        nutrient.forEach((nutrient, index) => {
            if (nutrientBars[index]) {
                this.render(nutrientBars[index], nutrient, index);
            }
        });
    },

    render(element, nutrient, index) {
        if (!element || !nutrient) {
            console.error('[NutrientBar] render: 提供了無效的元素或營養數據');
            return;
        }

        const showValue = parseFloat(nutrient.showValue) || 0;
        const dv = parseFloat(nutrient.nutrient_dv) || 0;

        let percent = 0;
        if (dv > 0) {
            percent = Math.round((showValue / dv) * 100);
        }

        const width = Math.max(percent, 3);

        let colorClass;
        if (percent < 4) {
            colorClass = 'bg-nutrient-low';
        } else {
            colorClass = this.colors[index % this.colors.length];
        }

        element.classList.remove(...this.colors);
        element.classList.add(colorClass);
        element.style.width = width + '%';
    }
};
const HealthImpactBar = {
    maxValues: {
        'GI 指數': 100,
        'GL 負荷': 20
    },

    init(healthImpactData, className) {
        const healthImpactBars = document.getElementsByClassName(className);
        if (!healthImpactBars || healthImpactBars.length === 0) {
            console.error(`[HealthImpactBar] init: 找不到 class 為 '${className}' 的元素`);
            return;
        }

        const dataArray = [healthImpactData.gi, healthImpactData.gl];

        if (healthImpactBars.length !== dataArray.length) {
            console.error(`[HealthImpactBar] init: DOM 元素數量 (${healthImpactBars.length}) 與數據長度 (${dataArray.length}) 不匹配`);
            return;
        }

        dataArray.forEach((item, index) => {
            if (healthImpactBars[index]) {
                this.render(healthImpactBars[index], item);
            }
        });
    },

    render(element, item) {
        if (!element || !item) {
            console.error('[HealthImpactBar] render: 提供了無效的元素或項目數據');
            return;
        }

        const value = parseFloat(item.value) || 0;
        const maxValue = this.maxValues[item.name] || 100;

        let percent = 0;
        if (maxValue > 0) {
            percent = (value / maxValue) * 100;
        }
        
        const width = Math.max(0, Math.min(100, percent));

        element.style.width = width + '%';
        element.style.backgroundColor = item.color;
    }
};
// --- End of progressbar.js ---

// --- Start of database.js ---
const _m_userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiaWFta3lvdG8wODMxIiwicGFzc3dvcmQiOiJzdHU3MDEyOCIsImlhdCI6MTc1MTM1MTQ4MH0.mfFALJGb7yH_pbfKLZtkSlQhJYMwAJCUT-8myEVmRBg"
const _m_userDB = "iamkyoto0831DB"

const Database = {
    sendDBRequest(mysql_query) {
        const API_URL = `https://iotapp.ttu.edu.tw:3002/mysqldb/sql?token=${_m_userToken}`;
        const config = { commands: mysql_query };

        return axios.put(API_URL, config)
            .then(response => response.data)
            .catch(handleRequestError);
    },

    async addFood(data) {
        const food_expiration_day = DateTime.getExpirationDay(data['food_expiration_date']);
        const SQL = `INSERT INTO ${_m_userDB}.Data0831Food (food_name, food_weight, food_image, food_added_date, food_expiration_date, food_expiration_day, food_type, storage_location) VALUES ("${data['food_name']}", "${data['food_weight']}", "${data['food_image']}","${data['food_added_date']}", "${data['food_expiration_date']}", ${food_expiration_day}, "${data['food_type']}", "${data['storage_location']}");`
        try {
            await this.sendDBRequest(SQL);
            _vm.$router.back()
        } catch (error) {
            console.error("[Database] addFood: 發生錯誤", error);
        }
    },

    /**
     * 批量插入食物的營養素數據
     * @param {number} food_id 食物ID
     * @param {Array<Object>} baseNutrients 營養素數據陣列，每個物件包含 nutrient_name 和 value
     * [,
        { "nutrient_name": "蛋白質", "value": 0.00 },
        { "nutrient_name": "總脂肪", "value": 0.00 },
        { "nutrient_name": "總碳水化合物", "value": 0.00 },
        { "nutrient_name": "膳食纖維", "value": 0.00 },
        { "nutrient_name": "糖", "value": 0.00 },
        { "nutrient_name": "鈉", "value": 0 },
        { "nutrient_name": "鈣", "value": 0 },
        { "nutrient_name": "鐵", "value": 0.00 }
    ]
     */
    async addUpdateFoodBaseNutrient(food_id, baseNutrients) {
        try {
            log("[Database] addUpdateFoodBaseNutrient: 開始更新基礎營養素", food_id, baseNutrients);
            if (!baseNutrients || baseNutrients.length === 0) {
                console.error("[Database] addUpdateFoodBaseNutrient: 基礎營養素為空");
                return;
            }

            const calories = Calorie.calCalorie_100g(baseNutrients);
            baseNutrients.push({ nutrient_name: '熱量', nutrient_value: calories.toFixed(2) });

            // 3. 構建 VALUES 子句並使用 ON DUPLICATE KEY UPDATE
            const valuesPromises = baseNutrients.map(nutrient => `(${food_id}, (SELECT nutrient_id FROM ${_m_userDB}.Data0831Nutrients WHERE nutrient_name = '${nutrient.nutrient_name}'), ${nutrient.nutrient_value})`
            );

            const valuesString = valuesPromises.join(',\n');
            const batchInsertQuery = `
                INSERT INTO ${_m_userDB}.Data0831FoodNutrients (food_id, nutrient_id, nutrient_value)
                VALUES ${valuesString}
                ON DUPLICATE KEY UPDATE nutrient_value  = VALUES(nutrient_value);
            `;
            await this.sendDBRequest(batchInsertQuery);
        } catch (error) {
            console.error("[Database] addUpdateFoodBaseNutrient: 發生錯誤", error);
        }
    },

    /**
     * 批量添加食物的特殊營養素。如果營養素不存在，會先創建。
     * @param {number} food_id 食物ID
     * @param {Array<Object>} specialNutrients 特殊營養素數據陣列，每個物件需包含 nutrient_name, value, nutrient_unit
     */
    async addUpdateFoodSpecialNutrient(food_id, specialNutrients) {
        if (!specialNutrients || specialNutrients.length === 0) {
            log("[Database] addUpdateFoodSpecialNutrient: 特殊營養素為空", specialNutrients);
            return;
        }
        try {
            log("[Database] addUpdateFoodSpecialNutrient: 開始更新特殊營養素", food_id, specialNutrients);
            // 1. 先刪除該食物所有現有的特殊營養素 (is_base = 0)
            const deleteQuery = `
                DELETE T1 FROM ${_m_userDB}.Data0831FoodNutrients AS T1
                JOIN ${_m_userDB}.Data0831Nutrients AS T2 ON T1.nutrient_id = T2.nutrient_id
                WHERE T1.food_id = ${food_id} AND T2.nutrient_is_base = 0;
            `;
            await this.sendDBRequest(deleteQuery);
            log("[Database] addUpdateFoodSpecialNutrient: 已清除舊的特殊營養素");
        } catch {
            console.error("[Database] addUpdateFoodSpecialNutrient: 清除舊的特殊營養素時發生錯誤");
            return;
        }

        try {
            // 批量插入食物的特殊營養素數值
            const valuesClauses = specialNutrients.map(nutrient =>
                `(${food_id}, (SELECT nutrient_id FROM ${_m_userDB}.Data0831Nutrients WHERE nutrient_name = '${nutrient.nutrient_name}'), ${nutrient.nutrient_value})`
            ).join(',\n');

            const batchInsertQuery = `
                INSERT INTO ${_m_userDB}.Data0831FoodNutrients (food_id, nutrient_id, nutrient_value)
                VALUES ${valuesClauses}
                ON DUPLICATE KEY UPDATE nutrient_value = VALUES(nutrient_value);
            `;
            await this.sendDBRequest(batchInsertQuery);
        } catch (error) {
            console.error("[Database] addUpdateFoodSpecialNutrient: 插入食物發生錯誤", error);
        }
    },

    /**
     * 為食物批量添加 LLM 生成的建議
     * @param {number} food_id 食物ID
     * @param {Array<Object>} suggestion 建議陣列，每個物件需包含 suggestion_type 和 suggestion_content
     */
    async addUpdateFoodSuggestion(food_id, suggestion) {
        try {
            log("[Database] addUpdateFoodSuggestion: 開始新增食物建議", food_id, suggestion);

            // 1. 先刪除該食物所有現有的建議
            const deleteQuery = `DELETE FROM ${_m_userDB}.Data0831FoodSuggestion WHERE food_id = ${food_id};`;
            await this.sendDBRequest(deleteQuery);

            if (!suggestion || suggestion.length === 0) return; // 如果沒有新資料，刪除後直接返回

            // 2. 插入新的建議
            const valuesClauses = suggestion.map(item => {
                const type = Object.keys(item)[0];
                let content = item[type];

                // 如果是智慧替換建議，內容本身就是一個 JSON 物件，將其字串化
                if (type === 'smart_replacement' && typeof content === 'object') {
                    content = JSON.stringify(content);
                }

                // 對最終的 content 字串進行單引號處理
                const escapedContent = content.replace(/'/g, "''");

                return `(${food_id}, '${type}', '${escapedContent}')`;
            }).join(',\n');

            const insertQuery = `
                INSERT INTO ${_m_userDB}.Data0831FoodSuggestion (food_id, suggestion_type, suggestion_content)
                VALUES ${valuesClauses};
            `;
            await this.sendDBRequest(insertQuery);
        } catch (error) {
            console.error("[Database] addUpdateFoodSuggestion: 發生錯誤", error);
        }
    },

    async discardFood(id) {
        const SQL = `UPDATE ${_m_userDB}.Data0831Food SET food_status = 'discarded', food_expiration_day = -1 WHERE food_id = ${id}`
        try {
            await this.sendDBRequest(SQL);
            _vm.$router.back()
        } catch (error) {
            console.error("[Database] discardFood: 發生錯誤", error);
        }
    },

    async consumedFood(id) {
        const SQL = `UPDATE ${_m_userDB}.Data0831Food SET food_status = 'consumed', food_expiration_day = -1 WHERE food_id = ${id}`
        try {
            await this.sendDBRequest(SQL);
            _vm.$router.back()
        } catch (error) {
            console.error("[Database] consumedFood: 發生錯誤", error);
        }
    },

    async modifyFood(id, new_data) {
        const food_expiration_day = DateTime.getExpirationDay(new_data['food_expiration_date']);
        const SQL = `UPDATE ${_m_userDB}.Data0831Food
    SET
        food_name = "${new_data['food_name']}",
        food_weight = "${new_data['food_weight']}",
        food_image = "${new_data['food_image']}",
        food_added_date = "${new_data['food_added_date']}",
        food_expiration_date = "${new_data['food_expiration_date']}",
        food_expiration_day = ${food_expiration_day},
        food_type = "${new_data['food_type']}",
        storage_location = "${new_data['storage_location']}"
    WHERE
        food_id = "${id}";`
        try {
            log("[Database] modifyFood: 開始修改食物資料");
            await this.sendDBRequest(SQL)
            _vm.$router.back()
        } catch (error) {
            console.error("[Database] modifyFood: 發生錯誤", error);
        }
    },

    async filterFood(searchValue, SVchange, filter, food, foodLength) {
        if (searchValue !== "") {
            SVchange.value = true;
        }
        const SQL = `SELECT *
    FROM ${_m_userDB}.Data0831Food
    WHERE
        food_status = 'existed'
      AND ('${searchValue}' = '' OR food_name LIKE CONCAT('%', '${searchValue}', '%'))
      AND ('${filter.type}' = '全部' OR food_type = '${filter.type}')
      AND ('${filter.location}' = '全部' OR storage_location = '${filter.location}')
    ORDER BY food_expiration_day ${filter.asc}
    `
        try {
            const response = await this.sendDBRequest(SQL);
            food.value = response;
            foodLength.value = response.length;
        } catch (error) {
            log("[Database] filterFood: 執行 SQL 查詢", SQL);
            console.error("[Database] filterFood: 發生錯誤", error);
        }
    },

    async fetchFood(food, foodLength) {
        const SQL =
            `SELECT * FROM ${_m_userDB}.Data0831Food WHERE food_status  = 'existed' ORDER BY food_expiration_day ASC`;

        let response = [];
        response = await this.sendDBRequest(SQL);
        food.value = response;
        foodLength.value = response.length;
        log("[Database] fetchFood: 成功獲取食物列表", response);
    },

    async fetchFoodNutrients(food_id, foodContents) {
        try {
            // 一次性獲取所有相關的營養素
            const response = await this.sendDBRequest(`
                SELECT
                    T1.food_id,
                    T1.nutrient_id,
                    T2.nutrient_name,
                    T1.nutrient_value,
                    T2.nutrient_unit,
                    T2.nutrient_desc,
                    T2.nutrient_is_base,
                    T2.nutrient_dv,
                    T2.nutrient_status
                FROM
                    Data0831FoodNutrients AS T1
                JOIN
                    Data0831Nutrients AS T2 ON T1.nutrient_id = T2.nutrient_id
                WHERE
                    T1.food_id = ${food_id}
                ORDER BY
                    T1.nutrient_id ASC;
            `);

            if (response.length > 0) {
                // 使用 JavaScript 的 filter 方法將結果分類
                foodContents.value.base = response.filter(nutrient => nutrient.nutrient_is_base == 1);

                // 特殊營養素同時過濾掉 nutrient_value 為 0 的項目
                foodContents.value.special = response.filter(nutrient => nutrient.nutrient_is_base == 0 && nutrient.nutrient_value > 0);

                log("[Database] fetchFoodNutrients: 基礎營養素", foodContents.value.base);
                log("[Database] fetchFoodNutrients: 特殊營養素", foodContents.value.special);
            }
        } catch (error) {
            console.error("[Database] fetchFoodNutrients: 發生錯誤", error);
        }
    },

    async fetchFoodSuggestion(food_id, foodContents) {
        const query = `SELECT * FROM Data0831FoodSuggestion WHERE food_id = ${food_id}`;
        try {
            const response = await this.sendDBRequest(query);
            if (response.length > 0) {
                foodContents.value.suggestion = response;
            } else {
                log("[Database] fetchFoodSuggestion: 沒有找到相關建議");
            }
        } catch (error) {
            console.error("[Database] fetchFoodSuggestion: 發生錯誤", error);
        }
    },

    /**
     * 獲取指定食物的操作日誌
     * @param {number} food_id 食物ID
     * @param {Object} foodLog 用於儲存日誌的 ref 物件
     */
    async fetchFoodLog(food_id, foodLog) {
        const query = `SELECT * FROM ${_m_userDB}.Data0831Log WHERE food_id = ${food_id} ORDER BY log_timestamp DESC`;
        try {
            const response = await this.sendDBRequest(query);
            if (response.length > 0) {
                foodLog.value = response;
            } else {
                foodLog.value = []; // 如果沒有日誌，則清空
            }
        } catch (error) {
            console.error("[Database] fetchFoodLog: 發生錯誤", error);
        }
    },

    async fetchDefinedSpecialNutrientNames() {
        log("[Database] fetchDefinedSpecialNutrientNames: 開始獲取已定義的特殊營養素");
        try {
            const query = `SELECT nutrient_name FROM ${_m_userDB}.Data0831Nutrients WHERE nutrient_is_base = 0;`;
            const response = await this.sendDBRequest(query);

            const names = response.map(item => item.nutrient_name);
            log("[Database] fetchDefinedSpecialNutrientNames: 成功獲取", names);
            return names;
        } catch (error) {
            console.error("[Database] fetchDefinedSpecialNutrientNames: 發生錯誤", error);
            return [];
        }
    },

    async addNewNutrientDefinitions(newDefinitions) {
        log("[Database] addNewNutrientDefinitions: 開始新增營養素定義", newDefinitions);
        try {
            const nutrientDefinitions = newDefinitions.map(n =>
                `('${n.nutrient_name}', '${n.nutrient_unit || 'g'}', '${n.nutrient_desc.replace(/'/g, "''")}', 0)`
            ).join(',\n');

            const ensureNutrientsQuery = `
                INSERT IGNORE INTO ${_m_userDB}.Data0831Nutrients (nutrient_name, nutrient_unit, nutrient_desc, nutrient_is_base)
                VALUES ${nutrientDefinitions};
            `;
            await this.sendDBRequest(ensureNutrientsQuery);
        } catch (error) {
            console.error("[Database] addNewNutrientDefinitions: 發生錯誤", error);
            throw error;
        }
    }
};
// --- End of database.js ---

// --- Start of gemini.js ---
const Gemini = {
    _api_k: "AIzaSyCVVWOdVJ2N3OQM1uSBnm9C2zyGXRWJNmY",
    _gemini_url: "https://generativelanguage.googleapis.com/v1beta/models/",

    /**
     * 與 gemini 通信，並回傳完整的原始回應。
     *
     * @param {object} requestData - 一個包含對話歷史和工具宣告的物件。
     * @param {string} _models - 要使用的模型名稱。
     * @returns {Promise<object>} - 一個解析為 API 完整回應物件的 Promise。
     */
    sendGeminiChatRaw(requestData, _models = "gemini-2.0-flash") {
        const _rest_api = this._gemini_url + _models + ":generateContent?key=" + this._api_k;
        return axios.post(_rest_api, requestData)
            .then(response => {log("[Gemini] sendGeminiChatRaw:", response); return response.data})
            .catch(handleRequestError);
    },

    /**
     * 與 gemini 通信，並回傳簡化的回應。
     * @param {requestData}
     * @returns {Promise}
     */
    sendGeminiChat(requestData, _models = "gemini-2.0-flash") {
        return this.sendGeminiChatRaw(requestData, _models).then(result => result.candidates[0].content.parts[0].text.trim());
    },

    /**
     * 統一的食物辨識函式，可處理文字、圖片或兩者。
     * @param {object} foodData - 包含辨識所需資料的 ref 物件。
     * @param {string} recognitionMode - 辨識模式 ('text', 'picture', 'text_and_picture')。
     * @param {string|null} voiceText - 可選的語音輸入文字。
     */
    async foodRecognition(foodData, recognitionMode = "picture", voiceText = null) {
        log(`[Gemini] food_recognition: 開始辨識，模式: ${recognitionMode}`);

        const time = DateTime.getCurrentDate();
        const _system_prompt = food_detect.gen_system_prompt.replace("$time", time);
        const contents = [];

        try {
            // 根據模式動態建立 contents
            switch (recognitionMode) {
                case 'text':
                    if (!voiceText.value || voiceText.value === '正在聆聽，請說話...') {
                        AlertSystem.showAlert("請提供文字資訊");
                        log('[Gemini] foodRecognition: 文字資訊無效, voiceText:', voiceText.value);
                        throw new Error("");
                    }
                    contents.push({
                        role: "user",
                        parts: [{ text: `${voiceText}` }]
                    });
                    break;

                case 'picture':
                    if (!foodData.value.food_image) {
                        AlertSystem.showAlert("請先上傳圖片");
                        throw new Error("圖片未提供");
                    }
                    const picBase64 = await getBase64Data(foodData.value.food_image);
                    contents.push({
                        role: "user",
                        parts: [
                            { text: "這是圖片" },
                            { inline_data: { mime_type: "image/jpeg", data: picBase64 } }
                        ]
                    });
                    break;

                case 'text_and_picture':
                    if (!voiceText || !foodData.value.food_image) {
                        AlertSystem.showAlert("請同時提供文字和圖片資訊");
                        throw new Error("文字或圖片資訊未提供");
                    }
                    const bothBase64 = await getBase64Data(foodData.value.food_image);
                    contents.push(
                        {
                            role: "user",
                            parts: [{ text: `${voiceText}` }]
                        },
                        {
                            role: "user",
                            parts: [
                                { text: "這是圖片" },
                                { inline_data: { mime_type: "image/jpeg", data: bothBase64 } }
                            ]
                        }
                    );
                    break;

                default:
                    const invalidModeMsg = `[Gemini] food_recognition: 無效的 recognitionMode: ${recognitionMode}`;
                    console.error(invalidModeMsg);
                    AlertSystem.showAlert("發生內部錯誤：無效的辨識模式");
                    throw new Error(invalidModeMsg);
            }

            const requestData = {
                "system_instruction": {
                    "parts": [{ "text": `${_system_prompt}` }]
                },
                "contents": contents,
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "response_schema": food_detect.schema
                }
            };

            let response = await this.sendGeminiChat(requestData);
            response = textToJsonStructure(response);
            // 合併到傳入的 data 物件中，注意 food_id 沒有被覆蓋
            Object.assign(foodData.value, response);

        } catch (error) {
            console.error(`[Gemini] food_recognition (${recognitionMode}): 發生錯誤`, error);
            AlertSystem.showAlert("辨識過程中發生錯誤，請稍後再試");
            throw error;// 重新抛出
        }
    },

    _ensureFoodImage(foodData) {
        if (!foodData.value.food_image) {
            AlertSystem.showAlert("請先上傳圖片");
            throw new Error("Food image is missing.");
        }
    },

    /**
     * 生成基礎食品資料 (例如: 熱量、蛋白質等)。
     */
    async genBaseNutrients(foodData, foodContents) {
        log("[Gemini] genBaseNutrients: 開始生成基礎食品資料");
        const userText = `這是${foodData.value.food_name}的圖片，他的相關資訊如下:${JSON.stringify(foodData.value)},請按照要求輸出基礎食品數據`;
        try {
            _ensureFoodImage(foodData);
            const base64Data = await getBase64Data(foodData.value.food_image);

            const requestData = {
                system_instruction: {
                    parts: [{ text: base_nutrients.gen_system_prompt }]
                },
                contents: [{
                    role: "user",
                    parts: [
                        { text: userText },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }],
                tools: [{ google_search: {} }]
            };

            const responseText = await this.sendGeminiChat(requestData, "gemini-2.5-flash");

            // 使用 textToJsonStructure 進行解析
            const result = textToJsonStructure(responseText);
            log("[Gemini] result: ", result);
            foodContents.value.base = result;

        } catch (error) {
            console.error("[Gemini] genBaseNutrients: 發生錯誤", error);
            throw error;
        }
    },

    /**
     * 生成特殊營養素資料。
     */
    async genSpecialNutrients(foodData, foodContents) {
        log("[Gemini] genSpecialNutrients: 開始生成特殊食品資料");
        const userText = `這是${foodData.value.food_name}的圖片，他的相關資訊如下:${JSON.stringify(foodData.value)},請按照格式輸出特殊營養素數據`;
        try {
            if (!foodData.value.food_image) {
                AlertSystem.showAlert("請先上傳圖片");
                throw new Error("Food image is missing.");
            }
            const base64Data = await getBase64Data(foodData.value.food_image);

            const requestData = {
                system_instruction: {
                    parts: [{ text: special_nutrients.gen_system_prompt }]
                },
                contents: [{
                    role: "user",
                    parts: [
                        { text: userText },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }],
                tools: [{ google_search: {} }]
            };
            const response = await this.sendGeminiChat(requestData, "gemini-2.5-flash");
            let result = textToJsonStructure(response);
            log("[Gemini] result: ", result);
            foodContents.value.special = result;
        } catch (error) {
            console.error("[Gemini] genSpecialNutrients: 發生錯誤", error);
            throw error;
        }
    },

    async genNutrientDefinitions(nutrientNames) {
        log("[Gemini] genNutrientDefinitions: 開始生成營養素定義", nutrientNames);
        try {
            const userText = `請為以下營養素列表提供詳細的定義，包含它們最常用的測量單位和一段簡潔的描述：${nutrientNames.join(', ')}`;

            const requestData = {
                system_instruction: {
                    parts: [{ text: nutrient_definition.gen_system_prompt }]
                },
                contents: [{ role: "user", parts: [{ text: userText }] }],
                generationConfig: {
                    "response_mime_type": "application/json",
                    "response_schema": nutrient_definition.schema
                }
            };

            const responseText = await this.sendGeminiChat(requestData, "gemini-2.5-flash");
            const result = textToJsonStructure(responseText);
            log("[Gemini] genNutrientDefinitions: 收到回應", result);
            return result;
        } catch (error) {
            console.error("[Gemini] genNutrientDefinitions: 發生錯誤", error);
            throw error;
        }
    },

    /**
     * 生成食品建議 (例如: 處理、保存或食譜建議)。
     */
    async genFoodSuggestion(foodData, foodContents = { value: {} }) {
        // 假設 _gen_food_suggestion_system_prompt 變數已在外部定義
        try {
            if (!foodData.value.food_image) {
                AlertSystem.showAlert("請先上傳圖片");
                throw new Error("Food image is missing.");
            }
            const base64Data = await getBase64Data(foodData.value.food_image);

            const requestData = {
                system_instruction: {
                    parts: [{ text: food_suggestion.gen_system_prompt }]
                },
                contents: [{
                    role: "user",
                    parts: [
                        { text: `這是${foodData.value.food_name}的圖片，他的相關資訊如下 foodData:${JSON.stringify(foodData.value)}; foodContents:${JSON.stringify(foodContents.value)}，請根據它提供食品建議` },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }],
                // tools: [{ google_search: {} }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: food_suggestion.schema,
                    thinking_config: {
                        include_thoughts: false,
                        thinking_budget: 2048
                    }
                }
            };
            const response = await this.sendGeminiChat(requestData, "gemini-2.5-flash");
            log("[Gemini] genFoodSuggestion: 收到回應", response);
            const result = textToJsonStructure(response);
            foodContents.value.suggestion = result;
        } catch (error) {
            console.error("[Gemini] genFoodSuggestion: 發生錯誤", error);
            throw error;
        }
    }
    ,
    /**
     * 生成智慧食品替代建議。
     */
    async genFoodReplacement(foodData, foodContents) {
        log("[Gemini] genFoodReplacement: 開始生成智慧替代建議");
        try {
            if (!foodData.value.food_image) {
                AlertSystem.showAlert("請先上傳圖片");
                throw new Error("Food image is missing.");
            }
            const base64Data = await getBase64Data(foodData.value.food_image);

            const requestData = {
                system_instruction: {
                    parts: [{ text: smart_replacement.gen_system_prompt }]
                },
                contents: [{
                    role: "user",
                    parts: [
                        { text: `這是${foodData.value.food_name}的圖片，他的相關資訊如下 foodData:${JSON.stringify(foodData.value)}; foodContents:${JSON.stringify(foodContents.value)}，請根據它提供智慧替代建議。` },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }],
                tools: [{ google_search: {} }]
            };
            const response = await this.sendGeminiChat(requestData, "gemini-2.5-flash");
            log("[Gemini] genFoodReplacement: 收到回應", response);
            const result = textToJsonStructure(response);
            foodContents.value.smartReplacement = result;
        } catch (error) {
            console.error("[Gemini] genFoodReplacement: 發生錯誤", error);
            throw error;
        }
    }
};
// --- End of gemini.js ---

// --- Start of composer.js ---
const Composer = {
    
}
// --- End of composer.js ---

// --- Start of function-calling.js ---
/**
 * @file FunctionCalling.js
 * @description 處理與 Gemini API 之間的 Function Calling 互動的核心模組。
 */
const FunctionCalling = {
    // 用於儲存已註冊的工具，包含宣告 (declaration) 和實作 (implementation)
    tools: {},

    /**
     * 註冊一個可供 AI 使用的工具。
     * @param {string} toolName - 工具的名稱。
     * @param {object} toolDeclaration - 工具的宣告，用於提供給 Gemini API。
     * @param {Function} toolImplementation - 工具的實際執行函式。
     */
    registerTool(toolName, toolDeclaration, toolImplementation) {
        log(`[FunctionCalling] 註冊工具: ${toolName}`);
        this.tools[toolName] = {
            declaration: toolDeclaration,
            implementation: toolImplementation,
        };
    },

    /**
     * 處理使用者訊息，並根據 AI 回應執行 Function Calling 流程。
     * @param {Array<object>} history - 當前的對話歷史。
     * @returns {Promise<string>} - 一個解析為最終 AI 文字回應的 Promise。
     */
    async handleMessage(history) {
        log("[FunctionCalling] 開始處理訊息", history);
        const toolDeclarations = this._getToolDeclarations();

        // === 步驟 1: 第一次呼叫 API，並附上工具定義 ===
        const requestData = {
            contents: history,
            tools: [{
                functionDeclarations: toolDeclarations
            }]
        };

        try {
            const response = await Gemini.sendGeminiChatRaw(requestData);
            log("[FunctionCalling] 收到第一次 API 回應", response);

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts;

            if (!parts) {
                throw new Error("從 API 收到的回應格式無效。");
            }

            // 檢查是否有 function call 請求
            const functionCalls = parts.filter(part => part.functionCall);

            if (functionCalls.length === 0) {
                // === 情況 A: 沒有 Function Call，直接回傳文字 ===
                log("[FunctionCalling] 無 Function Call，直接回傳文字。");
                return parts[0].text;
            } else {
                // === 情況 B: 有 Function Call，執行對應函式 ===
                log("[FunctionCalling] 偵測到 Function Call 請求", functionCalls);

                // 將模型的 functionCall 回應加入歷史紀錄
                history.push({
                    role: 'model',
                    parts: functionCalls
                });

                // 執行所有 function calls
                const functionResponses = await Promise.all(
                    functionCalls.map(async (fc) => {
                        const functionName = fc.functionCall.name;
                        const functionArgs = fc.functionCall.args;
                        const tool = this.tools[functionName];

                        if (tool) {
                            log(`[FunctionCalling] 執行函式: ${functionName}`, functionArgs);
                            const result = await tool.implementation(functionArgs);
                            return {
                                functionResponse: {
                                    name: functionName,
                                    response: { result: result }
                                }
                            };
                        } else {
                            throw new Error(`未知的函式名稱: ${functionName}`);
                        }
                    })
                );
                
                // 將函式執行結果加入歷史紀錄
                history.push({
                    role: 'function',
                    parts: functionResponses
                });

                // === 步驟 2: 帶著函式執行結果，再次呼叫 API ===
                log("[FunctionCalling] 帶著函式結果，第二次呼叫 API");
                const finalRequestData = {
                    contents: history,
                    tools: [{
                        functionDeclarations: toolDeclarations
                    }]
                };
                
                const finalResponse = await Gemini.sendGeminiChatRaw(finalRequestData);
                log("[FunctionCalling] 收到最終回應", finalResponse);
                
                return finalResponse.candidates[0].content.parts[0].text;
            }
        } catch (error) {
            console.error("[FunctionCalling] 處理訊息時發生錯誤:", error);
            AlertSystem.showAlert("AI 服務發生錯誤，請稍後再試。", {
                position: 'top-right',
                backgroundColor: 'rgb(217, 83, 79)'
            });
            throw error;
        }
    },

    /**
     * 從已註冊的工具中獲取所有函式宣告。
     * @returns {Array<object>} - 所有工具的宣告陣列。
     */
    _getToolDeclarations() {
        return Object.values(this.tools).map(tool => tool.declaration);
    }
};
// --- End of function-calling.js ---

// --- Start of foodcontent.js ---
const FoodContent = {
    /**
    * @param {Object} foodContents - 食物成分數據
    * @param {boolean} toggleMode - false: 100g true: 目前份量
    */
    toggleFoodContentsShow(foodContents, toggleMode) {
        // 同時更新 base 的 showValue
        foodContents.value.base?.forEach((base, _) => {
            if (!toggleMode && base.showValue === base.nutrient_value || toggleMode && base.showValue === base.realValue) return;
            base.showValue = (base.showValue === base.nutrient_value) ? base.realValue : base.nutrient_value;
        });
        
        // 同時更新 special 的 showValue
        foodContents.value.special?.forEach((special, _) => {
            if (!toggleMode && special.showValue === special.nutrient_value || toggleMode && special.showValue === special.realValue) return;
            special.showValue = (special.showValue === special.nutrient_value) ? special.realValue : special.nutrient_value;
        });
    },

    fetchFoodContents(foodContents, food_weight) {
        const fetchFoodBaseValue = () => {
            foodContents.value.base?.forEach(base => {
                base.realValue = (parseFloat(base.nutrient_value) * parseFloat(food_weight) / 100).toFixed(2);
                base.showValue = base.nutrient_value;
            });
        };

        const fetchFoodSpecialValue = () => {
            foodContents.value.special?.forEach(special => {
                special.realValue = (parseFloat(special.nutrient_value) * parseFloat(food_weight) / 100).toFixed(2);
                special.showValue = special.nutrient_value;
            });
        };

        // 處理基礎營養素
        if (foodContents.value?.base?.length === 9) {
            foodContents.value.caloriePercentage = Calorie.calCaloriePercentage(foodContents?.value?.base);
            fetchFoodBaseValue();
        } else {
            // foodContents.value.base 可能不存在或不完整
            AlertSystem.showAlert("未檢測到成分數據");
            log("[FoodContent] fetchFoodContents: 基礎營養素 (base) 沒有數據", foodContents);
        }

        // 處理特殊營養素
        if (foodContents.value?.special?.length === 6) {
            fetchFoodSpecialValue();
        } else {
            log("[FoodContent] fetchFoodContents: 特殊營養素 (special) 數據不存在或不完整", foodContents);
        }

        // 處理智能替換建議
        if (foodContents.value?.suggestion) {
            const replacementIndex = foodContents.value.suggestion.findIndex(
                s => s.suggestion_type === 'smart_replacement'
            );

            if (replacementIndex > -1) {
                try {
                    const replacementData = JSON.parse(foodContents.value.suggestion[replacementIndex].suggestion_content);
                    foodContents.value.smartReplacement = replacementData;
                    // 從建議列表中移除，避免重複顯示
                    foodContents.value.suggestion.splice(replacementIndex, 1);
                } catch (e) {
                    console.error("[FoodContent] fetchFoodContents: 解析智能替換建議失敗", e);
                    foodContents.value.smartReplacement = null;
                }
            }
        }
    },

    showScoreAlert(foodContents) {
        const score = foodContents.value?.base?.score;
        if (typeof score !== 'number') {
            AlertSystem.showAlert("分數尚未計算完成。");
            return;
        }

        if (score >= 75) {
            AlertSystem.showAlert(`綜合評分 ${score} 分：表現均衡，還不錯！`);
        } else if (score >= 50) {
            AlertSystem.showAlert(`綜合評分 ${score} 分：中規中矩，可以再調整一下飲食喔。`);
        } else {
            AlertSystem.showAlert(`綜合評分 ${score} 分：部分營養素攝取較不均衡，要注意喔！`);
        }
    }
}
// --- End of foodcontent.js ---

