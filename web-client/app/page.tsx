import { Metadata } from "next";
import React from "react";
import { Configurator } from "./configurator";

export const metadata: Metadata = {
    title: "Home | Paper Planes"
};

export const HomePage: React.FC = function () {
    return (
        <div className='text-center p-1'>
            <header>
                <h1>Paper Planes</h1>
                <h2>Airport traffic simulator</h2>
            </header>

            <main className='flex mt-2 flex-col gap-1 items-center'>
                <Configurator />
            </main>
        </div>
    );
};

export default HomePage;
