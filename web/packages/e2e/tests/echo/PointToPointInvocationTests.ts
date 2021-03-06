/**
 * Copyright 2017 Plexus Interop Deutsche Bank AG
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ClientsSetup } from "../common/ClientsSetup";
import { ConnectionProvider } from "../common/ConnectionProvider";
import { UnaryServiceHandler } from "./UnaryServiceHandler";
import { BaseEchoTest } from "./BaseEchoTest";
import * as plexus from "../../src/echo/gen/plexus-messages";

export class PointToPointInvocationTests extends BaseEchoTest {

    public constructor(
        private connectionProvider: ConnectionProvider,
        private clientsSetup: ClientsSetup = new ClientsSetup()) {
            super();
    }

    public testMessageSent(): Promise<void> {
        const echoRequest = this.clientsSetup.createRequestDto();
        return this.testMessageSentInternal(echoRequest);
    }

    private testMessageSentInternal(echoRequest: plexus.plexus.interop.testing.IEchoRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const handler = new UnaryServiceHandler(async (request) => {
                try {
                    this.assertEqual(request, echoRequest);
                } catch (error) {
                    console.error("Failed", error);
                    reject(error);
                }
                return request;
            });
            return this.clientsSetup.createEchoClients(this.connectionProvider, handler)
                .then(clients => {
                    console.log("Clients connected");
                    return clients[0].getEchoServiceProxy()
                        .unary(echoRequest)
                        .then(echoResponse => {
                            this.assertEqual(echoRequest, echoResponse);
                            return this.clientsSetup.disconnect(clients[0], clients[1]);
                        });
                })
                .then(() => resolve())
                .catch(error => reject(error));
        });
    }

    public testHugeMessageSent(): Promise<void> {
        const echoRequest = this.clientsSetup.createHugeRequestDto(10 * 65000);
        return this.testMessageSentInternal(echoRequest);
    }

    public testHostsExecutionErrorReceived(): Promise<void> {
        const echoRequest = this.clientsSetup.createRequestDto();
        return new Promise<void>((resolve, reject) => {
            const handler = new UnaryServiceHandler((request) => Promise.reject("Host error"));
            this.clientsSetup.createEchoClients(this.connectionProvider, handler)
                .then(clients => {
                    return clients[0].getEchoServiceProxy()
                        .unary(echoRequest)
                        .then(echoResponse => {
                            reject("Should not happen");
                            this.assertEqual(echoRequest, echoResponse);
                        })
                        .catch(error => {
                            console.log("Error received", error);
                            return this.clientsSetup.disconnect(clients[0], clients[1]);
                        });
                })
                .then(() => resolve())
                .catch(error => reject(error));
        });

    }

    public testFewMessagesSent(): Promise<void> {
        const echoRequest = this.clientsSetup.createRequestDto();
        return new Promise<void>((resolve, reject) => {
            const handler = new UnaryServiceHandler(async (request) => request);
            return this.clientsSetup.createEchoClients(this.connectionProvider, handler)
                .then(clients => {
                    console.log("Clients connected, sending multiple messages");
                    return (async () => {
                        let echoResponse = await clients[0].getEchoServiceProxy().unary(echoRequest);
                        this.assertEqual(echoRequest, echoResponse);
                        echoResponse = await clients[0].getEchoServiceProxy().unary(echoRequest);
                        this.assertEqual(echoRequest, echoResponse);
                        echoResponse = await clients[0].getEchoServiceProxy().unary(echoRequest);
                        this.assertEqual(echoRequest, echoResponse);
                    })()
                        .then(() => {
                            return this.clientsSetup.disconnect(clients[0], clients[1]);
                        });
                })
                .then(() => resolve())
                .catch(error => {
                    reject(error);
                });
        });

    }

}