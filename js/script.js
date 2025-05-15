const currentYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = currentYear;

// Handle drag and drop
const uploadContainer = document.getElementById('uploadContainer');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadContainer.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadContainer.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadContainer.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  uploadContainer.classList.add('active');
}

function unhighlight() {
  uploadContainer.classList.remove('active');
}

uploadContainer.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length) {
    fileInput.files = files;
    handleImage({ target: fileInput });
  }
}

// Main QRIS decoding function
function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Show file info
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('uploadInfo').classList.remove('hidden');
  
  const reader = new FileReader();
  reader.onload = function (e) {
    
    const img = new Image();
    img.onload = function () {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Show canvas container
      document.getElementById('canvasContainer').classList.remove('hidden');
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        document.getElementById('qrisCode').value = code.data;
        document.getElementById('copyBtn').classList.remove('hidden');
        document.getElementById('resultBody').innerHTML = '';
        
        // Update QR info section
        updateQRInfo(code.data);
        
        // Parse the QRIS data
        parseQRIS(code.data, 0);
        document.getElementById('resultSection').classList.remove('hidden');
      } else {
        showError("QR code tidak terbaca. Pastikan gambar QRIS jelas dan tidak blur.");
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateQRInfo(data) {
  const qrInfo = document.getElementById('qrInfo');
  
  // Basic parsing to get merchant info
  let merchantName = "Tidak diketahui";
  let amount = "Tidak diketahui";
  let currency = "IDR";
  
  // Simple parsing (not complete, just for demo)
  if (data.includes("59")) {
    const merchantIndex = data.indexOf("59");
    const length = parseInt(data.substring(merchantIndex + 2, merchantIndex + 4));
    merchantName = data.substring(merchantIndex + 4, merchantIndex + 4 + length);
  }
  
  if (data.includes("54")) {
    const amountIndex = data.indexOf("54");
    const length = parseInt(data.substring(amountIndex + 2, amountIndex + 4));
    amount = "Rp " + parseInt(data.substring(amountIndex + 4, amountIndex + 4 + length)).toLocaleString('id-ID');
  }
  
  qrInfo.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-indigo-50 p-4 rounded-lg">
        <p class="text-sm text-indigo-500 font-medium">Merchant</p>
        <p class="text-lg font-semibold mt-1">${merchantName}</p>
      </div>
      <div class="bg-green-50 p-4 rounded-lg">
        <p class="text-sm text-green-500 font-medium">Amount</p>
        <p class="text-lg font-semibold mt-1">${amount}</p>
      </div>
    </div>
    <div class="bg-gray-50 p-4 rounded-lg">
      <p class="text-sm text-gray-500 font-medium">Currency</p>
      <p class="text-lg font-semibold mt-1">${currency}</p>
    </div>
    <div class="bg-blue-50 p-4 rounded-lg">
      <p class="text-sm text-blue-500 font-medium">Status</p>
      <p class="text-lg font-semibold mt-1 text-green-600">Valid QRIS</p>
    </div>
  `;
}

function showError(message) {
  const qrInfo = document.getElementById('qrInfo');
  qrInfo.innerHTML = `
    <div class="bg-red-50 border-l-4 border-red-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="fas fa-exclamation-circle text-red-400"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">
            ${message}
          </p>
        </div>
      </div>
    </div>
  `;
}

function getTagDescription(tag, value) {
  const descriptions = {
    '00': `<span class="font-medium">Versi QRIS:</span> ${value}`,
    '01': value === '11' ? '<span class="font-medium">Tipe QR:</span> Statis (tidak bisa diubah nominal)' : 
          value === '12' ? '<span class="font-medium">Tipe QR:</span> Dinamis (bisa diubah nominal)' : 
          `<span class="font-medium">Tipe QR:</span> ${value}`,
    '26': '<span class="font-medium">Informasi penyedia:</span> Kode ini berisi informasi penerbit QRIS seperti bank atau e-wallet (contoh: Finpay, ShopeePay, OVO, dll)',
    '51': '<span class="font-medium">Kode penyedia:</span> Informasi tambahan tentang penyedia QRIS',
    '53': value === '360' ? '<span class="font-medium">Mata uang:</span> Rupiah (IDR)' : `<span class="font-medium">Mata uang:</span> ${value}`,
    '54': `<span class="font-medium">Nominal transaksi:</span> Rp ${parseInt(value, 10).toLocaleString('id-ID')}`,
    '58': value === 'ID' ? '<span class="font-medium">Negara:</span> Indonesia' : `<span class="font-medium">Negara:</span> ${value}`,
    '59': `<span class="font-medium">Nama Merchant:</span> ${value}`,
    '60': `<span class="font-medium">Kota Merchant:</span> ${value}`,
    '62': '<span class="font-medium">Informasi tambahan:</span> Berisi data tambahan seperti nomor referensi, invoice, atau informasi khusus merchant',
    '63': '<span class="font-medium">Checksum:</span> Digunakan untuk validasi integritas data QRIS'
  };
  return descriptions[tag] || '<span class="text-gray-500">Informasi tag ini belum tersedia</span>';
}

function parseQRIS(data, indent = 0, parentTag = '') {
  let i = 0;
  const tbody = document.getElementById('resultBody');
  
  // Clear previous results if not nested
  if (indent === 0) {
    tbody.innerHTML = '';
  }
  
  while (i + 4 <= data.length) {
    const tag = data.substring(i, i + 2);
    const length = parseInt(data.substring(i + 2, i + 4), 10);
    const value = data.substring(i + 4, i + 4 + length);
    if (isNaN(length)) break;
    
    const tr = document.createElement('tr');
    tr.className = indent > 0 ? 'bg-gray-50' : '';
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        <div class="flex items-center ${indent > 0 ? 'ml-4' : ''}">
          ${indent > 0 ? '<i class="fas fa-level-up-alt rotate-90 mr-2 text-gray-400"></i>' : ''}
          <span class="tag-badge px-2 py-1 rounded-md text-xs font-bold">${tag}</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span class="length-badge px-2 py-1 rounded-md text-xs font-bold">${length}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span class="value-badge px-2 py-1 rounded-md text-xs font-mono">${value}</span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">
        ${getTagDescription(tag, value)}
      </td>
    `;
    tbody.appendChild(tr);
    
    // Tag yang mengandung nested TLV (sub-tags)
    const nestedTags = ['26', '51', '62'];
    if (nestedTags.includes(tag)) {
      parseQRIS(value, indent + 1, tag); // rekursif untuk sub-tag
    }
    
    i += 4 + length;
  }
}

function copyToClipboard() {
  const qrisCode = document.getElementById('qrisCode');
  qrisCode.select();
  document.execCommand('copy');
  
  // Show copied notification
  const copyBtn = document.getElementById('copyBtn');
  const originalHTML = copyBtn.innerHTML;
  copyBtn.innerHTML = '<i class="fas fa-check"></i>';
  copyBtn.classList.remove('bg-gray-100', 'hover:bg-gray-200');
  copyBtn.classList.add('bg-green-100', 'hover:bg-green-200', 'text-green-600');
  
  setTimeout(() => {
    copyBtn.innerHTML = originalHTML;
    copyBtn.classList.remove('bg-green-100', 'hover:bg-green-200', 'text-green-600');
    copyBtn.classList.add('bg-gray-100', 'hover:bg-gray-200');
  }, 2000);
}

// Hide result section initially
document.getElementById('resultSection').classList.add('hidden');