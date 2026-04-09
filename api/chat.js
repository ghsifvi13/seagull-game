// api/chat.js

export default async function handler(req, res) {
    // משיכת המשתנים שהגדרת בלוח הבקרה של Vercel
    const apiKey = process.env.API_KEY;
    const systemInstruction = process.env.SYSTEM_PROMPT;

    // הגנה: מאפשר רק בקשות מסוג POST (כדי שלא יוכלו סתם להיכנס ללינק בדפדפן)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    try {
        // פנייה למודל Gemini 2.0 Flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { 
                    parts: [{ text: systemInstruction }] 
                },
                contents: [
                    { role: "user", parts: [{ text: question }] }
                ],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    temperature: 0, // עוזר ל-AI להיות עקבי מאוד עם ה"כן/לא"
                    maxOutputTokens: 50 // מספיק בהחלט לתשובות קצרות
                }
            })
        });

        const data = await response.json();

        // בדיקה אם גוגל החזירה שגיאה (למשל מפתח לא תקין)
        if (data.error) {
            console.error('Gemini Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // חילוץ התשובה מהמבנה של גוגל
        if (data.candidates && data.candidates[0].content) {
            const answer = data.candidates[0].content.parts[0].text.trim();
            return res.status(200).json({ answer });
        } else {
            // מקרה שבו התוכן נחסם בגלל בטיחות למרות ההגדרות
            return res.status(200).json({ answer: "התוכן נחסם על ידי מסנני הבטיחות של גוגל." });
        }

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
