import { BACKEND_URL } from "@/zustand/store";
export const getSectors = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/survey/sectors`);
    if (!response.ok) throw new Error("ERROR: Unable to fetch sectors.");
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("ERROR: Unable to fetch sectors:", e);
  }
};

export const submitSurvey = async (ID: string, selected: string[]) => {
  try {
    await fetch(`${BACKEND_URL}/survey`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ID,
        Sectors: selected,
      }),
    });
  } catch (e) {
    console.error("ERROR: Unable to submit survey:", e);
  }
};
