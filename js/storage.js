export const syncToSuperDB = async (url, key, data) => {
    if (!url || !key) {
        alert("Vui lòng cấu hình URL và Key của SuperDB trong phần Cấu hình!");
        return false;
    }
    
    try {
        // Defaulting to a Supabase-like POST structure
        const response = await fetch(`${url}/rest/v1/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                name: data.name || "Unnamed Project",
                project_data: data.state,
                updated_at: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            alert("Đã đồng bộ lên SuperDB thành công!");
            return true;
        } else {
            console.error(await response.text());
            alert("Lỗi khi đồng bộ lên SuperDB. Kiểm tra cấu hình!");
            return false;
        }
    } catch (error) {
        console.error(error);
        alert("Không thể kết nối tới SuperDB!");
        return false;
    }
};

export const fetchFromSuperDB = async (url, key) => {
    try {
        const response = await fetch(`${url}/rest/v1/projects?select=*&order=updated_at.desc`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};
