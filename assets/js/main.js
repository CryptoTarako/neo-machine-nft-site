// assets/js/main.js

console.log("=== main.js が読み込まれました ===");

// --------------------------- Firebase 初期化 ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCv5kfe5xlIPp9Mpp2htJ_M61T7IIwlhQw",
  authDomain: "neo-machine-nft-rd1.firebaseapp.com",
  projectId: "neo-machine-nft-rd1",
  storageBucket: "neo-machine-nft-rd1.firebasestorage.app",
  messagingSenderId: "882819727459",
  appId: "1:882819727459:web:e3efb37f64a53bfdaff856",
  measurementId: "G-Z2PMK2V4FR"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --------------------------- NFT 保有確認機能 ---------------------------

document.getElementById("walletForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const walletAddress = document.getElementById("walletAddress").value.trim();
  if (!walletAddress) {
    alert("ウォレットアドレスを入力してください。");
    return;
  }

  console.log("入力されたウォレットアドレス:", walletAddress);

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p>取得中...</p>";

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://bsc.blockrazor.xyz", 56);

    const abi = ["function balanceOf(address account, uint256 id) view returns (uint256)"];
    const contractAddress = "0x5c2e043f849E90F19FAb70FC1B02B816F882c229";
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const tokenIds = {
      "DAMD PANK": 1,
      "PEAKY PHANTOM": 2,
      "NEBULAROCKETS": 3,
      "Ξ V Ξ R": 4,
      "OVERDRIVE": 5
    };

    const db = firebase.firestore();
    const docRef = db.collection("winningTeam").doc("current");
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      resultDiv.innerHTML = "<p>大会結果が確定していません。</p>";
      return;
    }

    const data = docSnap.data();
    const winningTokenId = data.tokenId;
    const mintCounts = data.mintCounts || {}; // {1: x, 2: y...}

    let tableHtml = `<h2>NFT保有状況</h2><table class="nft-table"><thead><tr><th class='left'>チーム名</th><th class='right'>保有枚数</th></tr></thead><tbody>`;

    let userCount = 0;

    for (const [teamName, tokenId] of Object.entries(tokenIds)) {
      const balance = await contract.balanceOf(walletAddress, tokenId);
      const count = balance.toNumber();
      if (tokenId == winningTokenId) userCount = count;
      tableHtml += `<tr><td class='left'>${teamName}</td><td class='right'>${count}</td></tr>`;
    }

    tableHtml += `</tbody></table>`;

    // 払戻金計算（正確なロジック）
    const totalMinted = Object.values(mintCounts).reduce((sum, v) => sum + v, 0);
    const unitPrice = 50;
    const returnRate = 0.9;
    const totalReturn = unitPrice * returnRate * totalMinted;
    const winnerMinted = mintCounts[winningTokenId] || 0;
    const perNFT = winnerMinted > 0 ? totalReturn / winnerMinted : 0;
    const userPayout = perNFT * userCount;

    tableHtml += `
    <div class="payout-box">
      <h2 class="section-title">獲得賞金</h2>
      <p>優勝チーム：<strong>${Object.keys(tokenIds).find(key => tokenIds[key] == winningTokenId)}</strong></p>
      <p>1枚当たりの払戻金額：<strong>$${perNFT.toFixed(2)} / 枚</strong></p>
      <p>あなたの獲得賞金額：<strong class="highlight">$${userPayout.toFixed(2)}</strong></p>
    </div>
    `;
  

    resultDiv.innerHTML = tableHtml;

    // 払い戻し金額を画像生成モジュールに渡す
    window.generatedPayoutAmount = `$${userPayout.toFixed(2)}`;

    document.getElementById("image-generator").style.display = "block";

  } catch (err) {
    console.error("エラー:", err);
    resultDiv.innerHTML = "<p style='color: red;'>エラーが発生しました。詳細はコンソールをご確認ください。</p>";
  }
});

// --------------------------- 画像生成機能 ---------------------------

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('uploadImage');
  const generateBtn = document.getElementById('generateBtn');
  const canvas = document.getElementById('resultCanvas');
  const ctx = canvas.getContext('2d');
  const downloadLink = document.getElementById('downloadBtn');

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      if (!uploadInput.files[0]) {
        alert('画像を選択してください');
        return;
      }

      const payoutAmount = window.generatedPayoutAmount || "$0.00";

      const template = new Image();
      template.src = 'assets/images/template.png';

      const uploaded = new Image();
      uploaded.src = URL.createObjectURL(uploadInput.files[0]);

      await Promise.all([
        new Promise(resolve => template.onload = resolve),
        new Promise(resolve => uploaded.onload = resolve)
      ]);

      canvas.width = 1920;
      canvas.height = 1080;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(template, 0, 0, 1920, 1080);

      const squareSize = Math.min(uploaded.width, uploaded.height);
      const sx = (uploaded.width - squareSize) / 2;
      const sy = (uploaded.height - squareSize) / 2;
      ctx.drawImage(uploaded, sx, sy, squareSize, squareSize, 101, 432, 547, 547);

      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.font = 'bold 110px Oswald';
      ctx.fillText(`${payoutAmount} USDT`, 1250, 800);

      const dataURL = canvas.toDataURL();
      downloadLink.href = dataURL;
      downloadLink.style.display = 'inline-block';
    });
  }
});
