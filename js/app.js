/**
 * Quest AI Vision - App Logic
 */

// --- 設定エリア ---
// 注意: 本来はバックエンド経由で呼び出すのが安全ですが、
// クライアントサイドのみで完結させるため、ここに設定します。
const GEMINI_API_KEY = 'AIzaSyABSHt8mOwRwZuQJFgWsrGH9eFeVnTt1vo';
const GEMINI_MODEL = 'gemini-1.5-flash';

// --- 要素取得 ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const statusText = document.getElementById('statusText');
const resultText = document.getElementById('resultText');

/**
 * カメラの初期化
 */
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // 現実のカメラ
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = stream;
        console.log("Camera initialized");
    } catch (err) {
        console.error("Camera Access Error: ", err);
        updateStatus("カメラの起動に失敗しました。HTTPS環境かつ許可設定を確認してください。");
    }
}

/**
 * 状態表示の更新
 */
function updateStatus(msg) {
    statusText.setAttribute('value', msg);
}

/**
 * AIによる解析実行
 */
async function scanObject() {
    if (document.body.classList.contains('scanning')) return;

    document.body.classList.add('scanning');
    updateStatus("スキャン中...");
    resultText.setAttribute('value', "AIが画像を分析しています...");

    // 1. Canvasに現在のビデオフレームをキャプチャ
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Base64化
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    // 3. APIリクエスト
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [
                { text: "あなたはMRヘッドセットのアシスタントです。このカメラ画像に写っているものを認識し、それが何であるかを日本語で解説してください。回答は簡潔に3行以内でまとめてください。" },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
        }],
        generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.4
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        updateStatus("スキャン完了！");
        resultText.setAttribute('value', aiResponse);
        console.log("AI Response:", aiResponse);
    } catch (err) {
        console.error("AI Request Failed:", err);
        updateStatus("エラーが発生しました");
        resultText.setAttribute('value', "通信エラー、またはAPIキーが無効です。設定を確認してください。");
    } finally {
        document.body.classList.remove('scanning');
    }
}

// --- イベントリスナー ---

// ボタンクリック
captureBtn.addEventListener('click', scanObject);

// キーボード（Spaceキー）
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') scanObject();
});

// A-Frame コンポーネントでハンドトラッキングのイベントを登録
AFRAME.registerComponent('input-listener', {
    init: function () {
        // コントローラーのトリガー
        this.el.addEventListener('triggerdown', scanObject);
        // ハンドトラッキングのピンチ
        this.el.addEventListener('pinchstarted', scanObject);
    }
});

// 手のエンティティにコンポーネントを追加
document.addEventListener('DOMContentLoaded', () => {
    const hands = document.querySelectorAll('[hand-tracking-controls]');
    hands.forEach(h => h.setAttribute('input-listener', ''));

    // カメラ初期化
    initCamera();
});
