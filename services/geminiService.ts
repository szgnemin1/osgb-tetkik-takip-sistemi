import { Referral } from '../types';
import { GoogleGenAI } from "@google/genai";

// Note: In a real environment, this would call the actual API. 
// For this demo, we check if key exists, if not we mock it or fail gracefully.
// We strictly follow the provided guidance for @google/genai

export const analyzeResults = async (referral: Referral): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    // Graceful fallback if no API key is provided in the environment
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("API Anahtarı bulunamadı. (Demo Modu: Hasta işe giriş için uygundur, işitme testi normal sınırlar içerisindedir.)");
      }, 1000);
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct a prompt based on the referral data
    const prompt = `
      Aşağıdaki OSGB sağlık tarama verilerini analiz et ve işe uygunluk durumu hakkında 
      kısa, profesyonel bir özet yaz (maksimum 2 cümle).
      
      Personel: ${referral.employee.fullName}
      Tetkikler: ${referral.exams.join(', ')}
      Notlar: ${referral.notes || 'Yok'}
      
      Varsayım: Sonuçların genel olarak normal olduğunu varsayarak genel bir 'İşe Uygundur' veya 'Takip Gerekir' yorumu yap.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analiz sonucu alınamadı.";

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Analiz sırasında bir hata oluştu. Lütfen manuel kontrol sağlayınız.";
  }
};