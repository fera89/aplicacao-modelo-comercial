async function test() {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/insight-na-pratica-2026/databases/(default)/documents/notifications');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

test();
