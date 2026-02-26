"use client";

import React, { useState } from "react";
import { constants as D } from "./";

export const Configurator: React.FC = function () {
    const [inboundFlow, setInboundFlow] = useState(D.defaultInboundFlow);
    const [outboundFlow, setOutboundFlow] = useState(D.defaultOutboundFlow);
    const [runways, setRunways] = useState(D.defaultRunways);
    const [runs, setRuns] = useState(D.defaultRuns);
    const [seed, setSeed] = useState("");

    return (
        <form
            className='p-2 mb-1 max-w-xl'
            onSubmit={(e) => e.preventDefault()}
        >
            <header className='mb-2'>Please input the parameters for the simulation.</header>

            <fieldset>
                <div className='mb-2'>
                    <label>
                        Inbound flow per hour
                        <input
                            type='number'
                            name='inboundFlow'
                            value={inboundFlow}
                            onChange={(e) => setInboundFlow(Number(e.target.value))}
                            min={0}
                        />
                    </label>
                </div>

                <div>
                    <label>
                        Outbound flow per hour
                        <input
                            type='number'
                            name='outboundFlow'
                            value={outboundFlow}
                            onChange={(e) => setOutboundFlow(Number(e.target.value))}
                            min={0}
                        />
                    </label>
                </div>

                <div>
                    <label>
                        Number of runs
                        <input
                            type='number'
                            name='runs'
                            value={runs}
                            onChange={(e) => setRuns(Number(e.target.value))}
                            min={1}
                        />
                    </label>
                </div>
            </fieldset>

            <hr />

            <fieldset>
                <div>
                    <label>
                        Number of available runways
                        <input
                            type='number'
                            name='runways'
                            value={runways}
                            onChange={(e) => setRunways(Number(e.target.value))}
                            min={1}
                        />
                    </label>
                </div>
            </fieldset>

            <hr />

            <fieldset>
                <div>
                    <label>
                        Seed
                        <input
                            type='text'
                            name='seed'
                            placeholder='e.g. 12345'
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                        />
                    </label>
                </div>
            </fieldset>

            <button type='submit'>Start</button>
        </form>
    );
};
