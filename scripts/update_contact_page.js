(async () => {
  const fetch = global.fetch || (await import('node-fetch')).default;
  const API = 'http://localhost:3000/api';
  const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NjgzMTQzNzcsImV4cCI6MTc2ODMyMTU3N30.krbgV_MmK9mXAvmdXBQsgCP-5IlONtsNysV9doxLqtM';
  try {
    const res = await fetch(`${API}/pages/slug/contact`);
    const json = await res.json();
    if (!json.success) throw new Error('Failed to fetch contact page');
    const page = json.data;
    const id = page._id;
    // Try to source support contact details from the footer component (admin-managed)
    let supportPhone = '+977 9819922314';
    let supportEmail = 'support@fashionhub.com';
    let address = '123 Commerce St, New York, NY 10001';
    try {
      const footRes = await fetch(`${API}/components/slug/footer`);
      const footJson = await footRes.json();
      if (footJson && footJson.success && footJson.data && footJson.data.data) {
        const d = footJson.data.data;
        if (d.supportPhone) supportPhone = d.supportPhone;
        if (d.supportEmail) supportEmail = d.supportEmail;
        if (d.address) address = d.address;
      }
    } catch (e) { /* ignore and use defaults */ }

    const contentHtml = `<h1>Contact Us</h1><p>Email: ${supportEmail}<br>Phone: ${supportPhone}<br>Address: ${address}<br><a href="https://maps.google.com/?q=${encodeURIComponent(address)}">Open map</a></p>`;

    const updated = {
      slug: page.slug,
      title: 'Contact Us',
      content: contentHtml,
      published: true,
      meta: {
        description: 'Contact Fashion Hub',
        keywords: '',
        mapEmbed: `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
      }
    };

    const putRes = await fetch(`${API}/pages/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(updated)
    });
    const putJson = await putRes.json();
    console.log('PUT response:', putJson);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();