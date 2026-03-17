export const exportToExcel = (dataList) => {
    const data = [['STT', 'Sản phẩm', 'Giá tệ', 'SL', 'Vốn về tay', 'Gợi ý Sàn', 'Bán Ra (đ)', 'Đã Bán', 'Tồn', 'Lợi Nhuận/SP']];
    dataList.forEach((r, i) => {
        data.push([
            i + 1,
            r.name,
            r.price,
            r.qty,
            r.landed,
            r.shopee,
            r.actual,
            r.sold,
            r.stock,
            r.profit
        ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `OrderPlus_Pro_Export_${new Date().getTime()}.xlsx`);
};

export const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                resolve(json);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};
