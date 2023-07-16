'use strict';
'require uci';
'require view';
'require ui';
'require request';
'require fs';

var baseUrl = '/cgi-bin/luci/admin/network/pki';
var caFile = null;
var p12Enc = null;
var p12Sign = null;
var proCert = null;

return view.extend({
    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
    load: async function () {
        var keyExit = await this.initKeyStatus();
        var csrExit = await this.initCsrStatus();
        var names = await this.getCertName();

        return {
            keyExit: keyExit,
            csrExit: csrExit,
            csrName: names.csrName,
            caName: names.caName,
            encName: names.encName,
            signName: names.signName,
            proCertName: names.proCertName,
        };
    },
    render: function (data) {
        var keyExit = data.keyExit;
        var csrExit = data.csrExit;
        var csrName = data.csrName;
        var caName = data.caName;
        var encName = data.encName;
        var signName = data.signName;
        var proCertName = data.proCertName;

        this.hideNotiEvent();

        var conEle = E('div', {
            class: 'cbi-map'
        }, [
            E('link', { rel: 'stylesheet', type: 'text/css', href: '/luci-static/resources/view/pki/index.css' }),
            E('h2', {}, 'PKI配置'),
            E('div', { class: 'cbi-map-descr' }, 'PKI配置'),
            E('div', { class: 'cbi-selection' }, [
                E('div', { class: 'cbi-section-node' }, [
                    this.renderField('签名密钥生成', [
                        E('h4', { id: 'caTip', style: `margin-right: 10px; color:${keyExit ? 'var(--success-color)' : 'var(--danger-color)'}` }, keyExit ? '密钥已生成' : '密钥未生成'),
                        E('button', { id: 'delCaKey', class: 'btn cbi-button-remove', style: `display: ${keyExit ? 'block' : 'none'}`, click: ui.createHandlerFn(this, 'delCaKeyModal') }, '删除密钥'),
                        E('button', { id: 'genCaKey', class: 'btn cbi-button-action', style: `display: ${keyExit ? 'none' : 'block'}`, click: ui.createHandlerFn(this, 'genCaKey') }, '生成密钥'),
                    ]),
                    this.renderField('签名证书CSR生成', [
                        E('input', { disabled: keyExit ? undefined : '', value: csrName || undefined, id: 'certName', type: 'text', class: 'cbi-input-text', placeholder: 'CSR名称' }),
                        E('button', { disabled: keyExit ? undefined : '', id: 'genCertCsr', class: 'btn cbi-button-action', click: ui.createHandlerFn(this, 'genCertCsr') }, '生成'),
                    ]),
                    this.renderField('签名证书CSR导出', [
                        E('button', { disabled: csrExit ? undefined : '', id: 'csrExport', class: 'btn cbi-button-action', click: ui.createHandlerFn(this, 'csrExport') }, '签名证书导出'),
                    ]),
                    this.renderField('加密密钥保护结构', [
                        E('div', { style: 'display: flex' }, [
                            E('input', { id: 'proCertUpload', style: 'display:none', type: 'file' }),
                            E('button', { disabled: keyExit ? undefined : '', id: 'proCertClick', 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'proCertClick') }, '浏览...'),
                            E('input', { id: 'proCertFileName', value: proCertName, type: 'text', disabled: true, placeholder: '请选择加密密钥保护结构' }),
                        ]),
                        E('button', { id: 'proCertImport', disabled: keyExit ? undefined : '', style: 'margin-top: 10px', class: 'btn cbi-button-action', click: ui.createHandlerFn(this, 'proCertImport') }, '导入加密密钥保护结构'),
                    ]),
                    this.renderField('PKCS#12证书导入', [
                        E('div', { style: 'display: flex' }, [
                            E('input', { id: 'p12SignUpload', style: 'display:none', type: 'file' }),
                            E('button', { id: 'p12SignClick', disabled: keyExit ? '' : undefined, 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'p12SignClick') }, '浏览...'),
                            E('input', { id: 'p12SignFileName', value: signName || undefined, type: 'text', disabled: true, placeholder: '请选择签名证书' }),
                        ]),
                        E('div', { style: 'display: flex', style: 'margin-top: 6px', }, [
                            E('input', { id: 'p12EncUpload', style: 'display:none', type: 'file' }),
                            E('button', { id: 'p12EncClick', disabled: keyExit ? '' : undefined, 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'p12EncClick') }, '浏览...'),
                            E('input', { id: 'p12EncFileName', value: encName || undefined, type: 'text', disabled: true, placeholder: '请选择加密证书' }),
                        ]),
                        E('button', { id: 'p12Import', disabled: keyExit ? '' : undefined, style: 'margin-top: 10px', class: 'btn cbi-button-save', click: ui.createHandlerFn(this, 'p12ImportValid') }, '导入证书')
                    ]),
                    this.renderField('CA证书导入', [
                        E('div', { style: 'display: flex' }, [
                            E('input', { id: 'caUpload', style: 'display:none', type: 'file' }),
                            E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'caUploadClick') }, '浏览...'),
                            E('input', { id: 'caFileName', value: caName || undefined, type: 'text', disabled: true, placeholder: '请选择CA证书' }),
                        ]),
                        E('button', { class: 'btn cbi-button-save', style: 'margin-top: 10px', click: ui.createHandlerFn(this, 'uploadCert') }, '导入证书')
                    ]),
                ])
            ]),
            E('a', { id: 'csrDownload', display: 'none', download: 'sign_csr.pem' }),
            E('div', { class: 'cbi-page-actions' }, [
                E('button', { class: 'btn cbi-button-action', click: ui.createHandlerFn(this, 'onResetBtn') }, '重置'),
            ])
        ]);
        return conEle;
    },
    hideNotiEvent() {
        document.getElementById('maincontent').addEventListener('click', function (e) {
            var target = e.target;
            if (target.className == 'btn' && target.innerHTML == '关闭') {
                setTimeout(() => {
                    e.target.parentNode.parentNode.remove();
                }, 300);
            }
        });
    },
    renderField(title, ele) {
        return E('div', {
            class: 'cbi-value'
        }, [
            E('label', { class: 'cbi-value-title' }, title),
            E('div', { class: 'cbi-value-field' }, ele)
        ]);
    },
    showToast(msg, type = 'warning') {
        // type : info/success/warning
        document.querySelector('#maincontent .alert-message') && document.querySelector('#maincontent .alert-message').remove();
        ui.addNotification('提示', E('p', msg), type);
    },
    // 选择ca证书
    caUploadClick() {
        var caUpload = document.getElementById('caUpload');
        caUpload.addEventListener('change', function (e) {
            var files = e.target.files;
            if (files.length) {
                caFile = files[0];
                document.getElementById('caFileName').value = files[0].name;
            }
        });
        caUpload.click();
    },
    // 上传ca证书
    uploadCert() {
        if (!caFile) {
            this.showToast('请选择CA证书');
            return;
        };
        var that = this;
        var form = new FormData();
        form.append('file', caFile);
        form.append('fileName', caFile.name);
        request.post(baseUrl + '/ca_upload', form).then(function (response) {
            if (response.responseText == 'ok') {
                that.showToast('上传成功', 'success');
            } else {
                that.showToast('上传失败', 'error');
            }
        });
    },
    // 删除密钥
    delCaKeyModal() {
        ui.showModal('提示', [
            E('p', '确定要删除签名密钥吗？'),
            E('div', { 'class': 'right' }, [
                E('button', {
                    'class': 'btn',
                    'click': ui.hideModal
                }, '取消'), ' ',
                E('button', {
                    'class': 'btn cbi-button cbi-button-positive important',
                    'click': L.bind(this.delKey, this)
                }, '确定')
            ])
        ], 'modal-width450');
    },
    delKey() {
        var that = this;
        request.post(baseUrl + '/key_del').then(async function (response) {
            if (response.responseText == 'ok') {
                that.showToast('密钥删除成功', 'success');
                that.caKeyEleRender(false);
                that.csrExportEle(false);
                document.getElementById('certName').value = '';
            } else {
                that.showToast('密钥删除失败', 'warning');
            }
        });
    },
    // 生成密钥
    genCaKey() {
        var that = this;
        request.post(baseUrl + '/key_gen').then(async function (response) {
            if (response.responseText == 'ok') {
                that.showToast('密钥生成成功', 'success');
                that.caKeyEleRender(true);
            } else {
                that.showToast('密钥生成失败', 'warning');
            }
        });
    },
    // 生成密钥按钮 重新渲染
    caKeyEleRender(status) {
        var tip = '密钥未生成';
        if (status) {
            tip = '密钥已生成';
            document.getElementById('caTip').style.color = '#5CB85C';
            document.getElementById('delCaKey').style.display = 'block';
            document.getElementById('genCaKey').style.display = 'none';
            document.getElementById('certName').removeAttribute('disabled');
            document.getElementById('genCertCsr').removeAttribute('disabled');
            document.getElementById('p12EncClick').setAttribute('disabled', true);
            document.getElementById('p12SignClick').setAttribute('disabled', true);
            document.getElementById('p12Import').setAttribute('disabled', true);
            document.getElementById('proCertClick').removeAttribute('disabled');
            document.getElementById('proCertImport').removeAttribute('disabled');
        } else {
            document.getElementById('caTip').style.color = '#C11';
            document.getElementById('genCaKey').style.display = 'block';
            document.getElementById('delCaKey').style.display = 'none';
            document.getElementById('certName').setAttribute('disabled', true);
            document.getElementById('genCertCsr').setAttribute('disabled', true);
            document.getElementById('proCertClick').setAttribute('disabled', true);
            document.getElementById('proCertImport').setAttribute('disabled', true);
            document.getElementById('p12EncClick').removeAttribute('disabled');
            document.getElementById('p12SignClick').removeAttribute('disabled');
            document.getElementById('p12Import').removeAttribute('disabled');
        }
        document.getElementById('caTip').innerHTML = tip;
    },
    // 初始化查询密钥状态
    async initKeyStatus() {
        var res = await request.get(baseUrl + '/key_status');
        if (res.responseText && res.responseText == 'ok') {
            return true;
        };
        return false;
    },
    // 生成签名证书CSR
    genCertCsr() {
        var that = this;
        var value = document.getElementById('certName').value;
        if (!value) {
            this.showToast('请输入签名证书名称', 'warning');
            return;
        }

        request.post(baseUrl + '/csr_gen', {
            name: value
        }).then(async function (response) {
            if (response.responseText == 'ok') {
                that.showToast('CSR生成成功', 'success');
                that.csrExportEle(true);
            } else {
                that.showToast('CSR生成失败', 'warning');
            }
        });
    },
    // CSR导出
    csrExport() {
        var csrDownload = document.getElementById('csrDownload');
        csrDownload.setAttribute('href', '/luci-static/resources/view/pki/sign_csr.pem');
        csrDownload.click();
    },
    // CSR导出按钮 重新渲染
    csrExportEle(status) {
        if (status) {
            document.getElementById('csrExport').removeAttribute('disabled');
        } else {
            document.getElementById('csrExport').setAttribute('disabled', true);
        }
    },
    // 选择p12加密证书
    p12EncClick() {
        var p12EncUpload = document.getElementById('p12EncUpload');
        p12EncUpload.addEventListener('change', function (e) {
            var files = e.target.files;
            if (files.length) {
                p12Enc = files[0];
                document.getElementById('p12EncFileName').value = files[0].name;
            }
        });
        p12EncUpload.click();
    },
    // 选择p12签名证书
    p12SignClick() {
        var p12SignUpload = document.getElementById('p12SignUpload');
        p12SignUpload.addEventListener('change', function (e) {
            var files = e.target.files;
            if (files.length) {
                p12Sign = files[0];
                document.getElementById('p12SignFileName').value = files[0].name;
            }
        });
        p12SignUpload.click();
    },
    // p12证书导入 校验
    p12ImportValid() {
        if (!p12Sign) {
            this.showToast('请选择签名证书');
            return;
        }
        if (!p12Enc) {
            this.showToast('请选择加密证书');
            return;
        }

        ui.showModal('提示', [
            E('div', {
                class: 'cbi-map'
            }, [
                E('div', { class: 'cbi-selection' }, [
                    E('div', { class: 'cbi-section-node' }, [
                        this.renderField('签名证书口令', [
                            E('input', { id: 'signPswd', type: 'text', class: 'cbi-input-text', placeholder: '请输入口令' }),
                        ]),
                    ]),
                    E('div', { class: 'cbi-section-node' }, [
                        this.renderField('加密证书口令', [
                            E('input', { id: 'encPswd', type: 'text', class: 'cbi-input-text', placeholder: '请输入口令' }),
                        ]),
                    ])
                ]),
            ]),
            E('div', { 'class': 'right' }, [
                E('button', {
                    'class': 'btn',
                    'click': ui.hideModal
                }, '取消'), ' ',
                E('button', {
                    'class': 'btn cbi-button cbi-button-positive important',
                    'click': L.bind(this.p12Import, this)
                }, '确定')
            ])
        ], 'modal-width40');
    },
    async p12Import() {
        var signPswd = document.getElementById('signPswd');
        if (!signPswd.value) {
            ui.addValidator(document.getElementById('signPswd'), 'uciname', true, function (v) {
                if (v !== '') {
                    return true;
                }
                else {
                    return '请输入口令';
                }
            }, 'blur', 'keyup');
            return;
        }
        var encPswd = document.getElementById('encPswd');
        if (!encPswd.value) {
            ui.addValidator(encPswd, 'uciname', true, function (v) {
                if (v !== '') {
                    return true;
                }
                else {
                    return '请输入口令';
                }
            }, 'blur', 'keyup');
            return;
        }
        try {
            var encForm = new FormData();
            encForm.append('file', p12Enc);
            encForm.append('pswd', encPswd.value);
            encForm.append('fileName', p12Enc.name);
            var encRes = await request.post(baseUrl + '/p12_enc', encForm);
            var signForm = new FormData();
            signForm.append('file', p12Sign);
            signForm.append('pswd', signPswd.value);
            signForm.append('fileName', p12Sign.name);
            var signRes = await request.post(baseUrl + '/p12_sign', signForm);
            ui.hideModal();
            document.getElementById('signPswd').value = '';
            document.getElementById('encPswd').value = '';
            if (encRes.status == 200 && signRes.status == 200) {
                this.showToast('上传成功', 'success');
            } else {
                this.showToast('上传失败', 'error');
            }
        } catch (error) {
            this.showToast('上传失败', 'error');
        }
    },
    // 选择密钥保护结构
    proCertClick() {
        var proCertUpload = document.getElementById('proCertUpload');
        proCertUpload.addEventListener('change', function (e) {
            var files = e.target.files;
            if (files.length) {
                proCert = files[0];
                document.getElementById('proCertFileName').value = files[0].name;
            }
        });
        proCertUpload.click();
    },
    // TODO 加密密钥结构导入
    proCertImport() {
        if (!proCert) {
            this.showToast('请选择加密密钥保护结构');
            return;
        }
        var that = this;
        var form = new FormData();
        form.append('file', proCert);
        form.append('fileName', proCert.name);
        request.post(baseUrl + '/pro_cert_upload', form).then(function (response) {
            if (response.responseText == 'ok') {
                that.showToast('上传成功', 'success');
            } else {
                that.showToast('上传失败', 'error');
            }
        });
    },
    // 初始化查询csr状态
    async initCsrStatus() {
        var res = await request.get(baseUrl + '/csr_status');
        if (res.responseText && res.responseText == 'ok') {
            return true;
        };
        return false;
    },
    // 重置
    async onResetBtn() {
        var res = await request.get(baseUrl + '/has_ipsec');
        if (res.responseText && res.responseText == 'ok') {
            this.showToast('证书被隧道占用，无法重置！');
            ui.hideModal();
            return;
        }
        ui.showModal('提示', [
            E('p', '确定要重置所有操作？'),
            E('p', '此操作将会删除所有证书和密钥!!'),
            E('p', '此操作将会关闭登录双重认证!!'),
            E('div', { 'class': 'right' }, [
                E('button', {
                    'class': 'btn',
                    'click': ui.hideModal
                }, '取消'), ' ',
                E('button', {
                    'class': 'btn cbi-button cbi-button-positive important',
                    'click': L.bind(this.onReset, this)
                }, '确定')
            ])
        ], 'modal-width450');
    },
    onReset() {
        var that = this;
        request.post(baseUrl + '/reset').then(function res(res) {
            if (res.responseText == 'ok') {
                that.caKeyEleRender(false);
                that.csrExportEle(false);
                document.getElementById('certName').value = '';
                document.getElementById('caFileName').value = '';
                document.getElementById('p12SignFileName').value = '';
                document.getElementById('p12EncFileName').value = '';
                caFile = null;
                p12Enc = null;
                p12Sign = null;
                ui.hideModal();
            } else {

            }
        });
    },
    async getCertName() {
        var res = await request.get(baseUrl + '/get_cert_name');
        if (res.responseText) {
            return JSON.parse(res.responseText);
        };
        return {};
    }
});

