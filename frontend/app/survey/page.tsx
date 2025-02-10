"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeCheck } from "lucide-react";
import { getSectors, submitSurvey } from "@/app/utils/api";
import { useStore } from "@/zustand/store";
import { permanentRedirect } from "next/navigation";

const Page = () => {
  const [sectors, setSectors] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const { user } = useStore((state) => state);

  useEffect(() => {
    const fetchSectors = async () => {
      const data = await getSectors();
      if (data) setSectors(data);
    };

    fetchSectors();
  }, []);

  const handleSelection = (sector: string) => {
    setSelected(
      (currentlySelected) =>
        currentlySelected.includes(sector)
          ? currentlySelected.filter((item) => item !== sector) // removes selection if already selected
          : currentlySelected.length < 5 // if less than 5 are selected, consider adding the new selection
          ? [...currentlySelected, sector] // adds selection
          : currentlySelected // length >= 5, don't add selection
    );
  };

  const handleSubmit = async () => {
    await submitSurvey(user.ID, selected);
    permanentRedirect("/dashboard"); // don't let the user go back to the survey
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-6">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-2xl font-semibold">What are you interested in?</h1>
        <p className="text-muted-foreground mt-2">Select up to five sectors</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {sectors.map((sector) => (
            <div key={sector}>
              <Card
                className={`relative cursor-pointer p-4 border transition-all rounded-xl shadow-md hover:shadow-lg h-16 flex items-center 
                    ${
                      selected.includes(sector)
                        ? "border-sidebar-foreground bg-sidebar-accent"
                        : "bg-white"
                    }`}
                onClick={() => handleSelection(sector)}
              >
                <CardContent className="flex items-center w-full p-0 px-4">
                  <div className="flex-1 text-sm font-medium">{sector}</div>
                  {selected.includes(sector) ? (
                    <BadgeCheck className="w-7 h-7 ml-2" />
                  ) : (
                    <Badge className="w-7 h-7 ml-2" />
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <Button
          className="mt-6 w-full sm:w-auto bg-button-background text-accent hover:bg-button-foreground shadow-md hover:shadow-lg"
          onClick={handleSubmit}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Page;
