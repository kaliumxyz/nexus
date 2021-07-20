#!/usr/bin/env node
'use strict';
const { Bot }         = require('euphoria.js');
const { spawn, fork } = require('child_process');

const k               = 'account:03oav0qe3ah34';

function master (room = process.argv[2]) {
    const bot      = new Bot('nexus', room, {reconect: true, stateless: true});
    const children = [];

    let prefix     = ".";

    bot.commands['!help'] = bot._make_reaction('This is a bot which runs scripts on demand.');
    bot.commands[`!help ${bot._id}`] = bot._make_reaction(`This bot takes commands from @K his account, with the exception of the botrules commands. In case of emergency or abuse please !kill this bot to remove all the forks. Ask @K to make a shell for you!`);

    attach_listeners_master(bot)

		process.once('exit', () => {
        children.forEach(child => child.kill())
		});

    return bot;

    function attach_listeners_master (bot) {
        bot.on('ready', () => {
            bot.on('post', data => {
                if ( data.sender.id === k && data.bot.parsed.startsWith(prefix) ) {
                    const input = data.bot.parsed.slice(prefix.length);
                    switch (true) {
                    case input.startsWith('child'):
                        if (!input.match(/&\w+/))
                            break;
                        const child = fork(process.argv[1], [input.match(/&(\w+)/)[1]],
                                           {
                                               stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                                           });
                        child.on("message", x => {
                            console.log(x);
                        });
                        children.push(child);
                        bot.reply(`child ${children.length - 1} created`);
                        break;
                        // case content.startsWith('.children'):
                        //     bot.reply(JSON.stringify(children))
                        //     break;
                    default:
                        console.log(`${data.sender.name}: ${input}`)
                        try {
                            bot.reply(`${eval(input)}`);
                        } catch (e) {
                            bot.reply(`${e}`);
                        }
                        break;
                    }
                }
            });
        });
    }
}

function worker () {
    let shell = false;
    let lock = false;
    let owner = false;

    const bot = new Bot('node', process.argv[2], {reconect: true, stateless: true});

    let prefix = `${bot._id} `;

    const backdoor = {}
    const help = `
my capabilities depend on my mode:
prefix:  \`${prefix}\`
commands:
 - help
   print this help.
 - bash
   start a bash shell.
 - sh
   start a sh shell.
 - zsh
   start a zsh shell.
 - nix
   start a nix repl.
 - haskell
   start a haskell repl.
 - ruby
   start a ruby repl.
 - python
   start a python repl.
 - claim
   claim the exclusive usage of this bot
 - lock
   lock this bot from all but the owner
 - unlock
   unlock this bot to be used by all
 - exit
   quit any shell

feel free to overwrite any of my functionality
`


    bot.commands['!help'] = bot._make_reaction('I\'m a repl bot!');
    bot.commands[`!help ${bot._id}`] = id => bot.post(help, id);

    bot.on('ready', () => {
        process.send({type: "status", data: "ready"});
        // bot.post(`hello! talk to me using \`${prefix}\``);
        bot.on('post', data => {
            if(data.sender.id === k || !lock || data.sender.id === owner) {
                if (data.bot.parsed.startsWith(prefix)) {
                    const input = data.bot.parsed.slice(prefix.length).trim();
                    switch (true) {
                    case input.startsWith('help'):
                        bot.reply(help);
                        break;
                    case input.startsWith('unlock'):
                        lock = false;
                        bot.reply(`bot unlocked!`);
                        break;
                    case input.startsWith('lock'):
                        lock = true;
                        if (owner)
                            bot.reply(`bot locked with exception to ${owner}!`);
                        else
                            bot.reply(`bot locked!`);
                        break;
                    case input.startsWith('claim'):
                        owner = data.sender.id;
                        lock = true;
                        bot.reply(`bot locked with exception to ${owner}!`);
                        break;
                    case input.startsWith('bash'):
                        if (shell)
                            break;
                        shell = spawn("bash",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "bash";
                        bot.reply(`bash started, use \`$\` as a prefix to execute bash statements`);
                        prefix = "$";
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('ruby'):
                        if (shell)
                            break;
                        shell = spawn("irb",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "ruby";
                        bot.reply(`irb started, use \`>\` as a prefix to execute ruby statements`);
                        prefix = ">";
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('sh'):
                        if (shell)
                            break;
                        shell = spawn("/bin/sh",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "sh";
                        bot.reply(`sh started, use \`$\` as a prefix to execute sh statements`);
                        prefix = "$";
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('python'):
                        if (shell)
                            break;
                        shell = spawn("python",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "python";
                        prefix = "> ";
                        bot.reply(`python started, use \`> \` as a prefix to execute python statements`);
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('haskell'):
                        if (shell)
                            break;
                        shell = spawn("stack", ["repl"],
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "stack";
                        prefix = ">";
                        bot.reply(`nix repl started, use \`>\` as a prefix to execute nix statements. Exit using \`exit\`.`);

                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('nix'):
                        if (shell)
                            break;
                        shell = spawn("nix", ["repl"],
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = "nix";
                        prefix = ">";
                        bot.reply(`nix repl started, use \`>\` as a prefix to execute nix statements. Exit using \`exit\`.`);

                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        })
                        break;
                    case input.startsWith('exit'):
                        if (shell) {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot._id} `;
                        }
                        break;
                    default:
                        console.log(`${data.sender.name}: ${input}`)
                        if (shell) {
                            shell.stdin.write(`${data.bot.parsed.slice(prefix.length)}\n`);
                        } else {
                            try {
                                bot.reply(`${eval(input)}`);
                            } catch (e) {
                                bot.reply(`${e}`);
                            }
                        }
                        break;
                    }

                }
            }
        });
    });
}

//https://nodejs.org/api/process.html#process_process_send_message_sendhandle_options_callback
if (process.send === undefined) {
    master();
} else {
    worker();
}


