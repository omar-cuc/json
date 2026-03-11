// Configuración de gráficas
const graficas = [
    { id: 1, nombre: 'Gráfica 1', datafile: 'data1.json', img: null },
    { id: 2, nombre: 'Gráfica 2', datafile: 'data2.json', img: null },
    { id: 3, nombre: 'Gráfica 3', datafile: 'data3.json', img: null },
    { id: 4, nombre: 'Gráfica 4', datafile: 'data4.json', img: null }
];

// Configuración específica para gráfica 3 (múltiples campos)
const config3 = {
    titulo_1: { label: 'Título 1', tipo: 'texto' },
    caja_texto: { label: 'Caja de Texto', tipo: 'texto' },
    foto_1: { label: 'Foto 1', tipo: 'imagen' }
};

// Configuración específica para gráfica 4 (múltiples campos + colores)
const config4 = {
    titulo_1: { label: 'Título', tipo: 'texto' },
    caja_texto_1: { label: 'Caja de Texto', tipo: 'texto' },
    barra_sombra: { label: 'Color Barra Sombra', tipo: 'color' },
    full_barra: { label: 'Color Barra Principal', tipo: 'color' }
};

// Variables globales
let currentEditingGrafica = null;
let graficasData = {};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    cargarGraficas();
    
    // Event listeners para los botones del modal
    document.getElementById('saveJsonBtn').addEventListener('click', guardarJsonEditado);
    document.getElementById('toggleAdvanced').addEventListener('change', toggleAdvancedEditor);
});

/**
 * Cargar todas las gráficas
 */
async function cargarGraficas() {
    const container = document.getElementById('graficasContainer');
    container.innerHTML = '';
    
    for (const grafica of graficas) {
        try {
            // Cargar el JSON (con timestamp para evitar caché)
            const response = await fetch(grafica.datafile + '?t=' + Date.now());
            const jsonData = await response.json();
            graficasData[grafica.id] = { ...jsonData };
            
            // Crear la tarjeta
            const card = crearTarjetaGrafica(grafica);
            container.appendChild(card);
        } catch (error) {
            console.error(`Error loading ${grafica.datafile}:`, error);
        }
    }
}

/**
 * Crear la estructura de una tarjeta de gráfica
 */
function crearTarjetaGrafica(grafica) {
    const card = document.createElement('div');
    card.className = 'grafica-card';
    
    card.innerHTML = `
        <div class="grafica-content">
            <!-- Lado izquierdo: Animación Lottie -->
            <div class="grafica-left">
                <div class="animation-container">
                    <lottie-player 
                        src="${grafica.datafile}?t=${Date.now()}" 
                        background="transparent" 
                        speed="1" 
                        loop 
                        autoplay>
                    </lottie-player>
                </div>
                
                <!-- Botones de acción -->
                <div class="button-group">
                    <button class="btn-custom btn-edit" onclick="abrirEditorJson(${grafica.id})">
                        ✏️ Editar Json
                    </button>
                    <button class="btn-custom btn-download" onclick="descargarJson(${grafica.id})">
                        ⬇️ Descargar Json
                    </button>
                    <button class="btn-custom btn-view" onclick="visualizarAnimacion(${grafica.id})">
                        👁️ Visualizar
                    </button>
                </div>
                
                <div class="grafica-title">${grafica.nombre}</div>
            </div>
            
            <!-- Lado derecho: Imagen -->
            <div class="grafica-right">
                ${grafica.img ? `<img src="${grafica.img}" class="placeholder-image" alt="${grafica.nombre}">` : 'Imagen 1080x720'}
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Convertir RGB normalizado (0-1) a HEX
 */
function rgbToHex(r, g, b) {
    const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Convertir HEX a RGB normalizado (0-1)
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ];
    }
    return [0, 0, 0];
}

/**
 * Actualizar campo HEX cuando cambia el color picker
 */
function actualizarColorHex() {
    const colorInput = document.getElementById('colorInput');
    const colorHex = document.getElementById('colorHex');
    colorHex.value = colorInput.value.toUpperCase();
}

/**
 * Actualizar color picker cuando se cambia el HEX
 */
function actualizarColorInput() {
    const colorHex = document.getElementById('colorHex');
    const colorInput = document.getElementById('colorInput');
    
    // Validar formato HEX
    if (/^#[0-9A-F]{6}$/i.test(colorHex.value)) {
        colorInput.value = colorHex.value;
    }
}

/**
 * Toggle entre editor simple y avanzado
 */
function toggleAdvancedEditor() {
    const isAdvanced = document.getElementById('toggleAdvanced').checked;
    document.getElementById('simpleEditFields').style.display = isAdvanced ? 'none' : 'block';
    document.getElementById('jsonEditor').style.display = isAdvanced ? 'block' : 'none';
}

/**
 * Extraer texto y color del JSON
 */
function extraerElementosEditables(jsonData) {
    let texto = 'HOLA RCN';
    let color = '#0072FF'; // Azul por defecto
    
    try {
        // Buscar la capa de texto que contiene texto (type 5 = text layer)
        // Buscar TODAS las capas de texto y obtener la que tenga contenido más largo (menos probable que sea vacía)
        const textLayers = jsonData.layers.filter(l => {
            return l.ty === 5 && l.t && l.t.d && l.t.d.k && l.t.d.k[0] && l.t.d.k[0].s && l.t.d.k[0].s.t;
        }).sort((a, b) => {
            const aLen = a.t.d.k[0].s.t.trim().length;
            const bLen = b.t.d.k[0].s.t.trim().length;
            return bLen - aLen; // Ordenar por longitud descendente
        });
        
        const textLayer = textLayers.find(l => l.t.d.k[0].s.t.trim() !== '');
        
        if (textLayer && textLayer.t && textLayer.t.d && textLayer.t.d.k && textLayer.t.d.k[0]) {
            // Obtener el texto del contenido (más fiable que el nombre)
            texto = textLayer.t.d.k[0].s.t;
            console.log('Texto encontrado:', texto);
        }
        
        // Buscar la capa de forma (Shape Layer) que tiene color
        const shapeLayer = jsonData.layers.find(l => {
            return l.ty === 4 && l.shapes && l.shapes.length > 0;
        });
        
        if (shapeLayer && shapeLayer.shapes && shapeLayer.shapes[0] && shapeLayer.shapes[0].it) {
            const fillIndex = shapeLayer.shapes[0].it.findIndex(item => item.ty === 'fl');
            if (fillIndex !== -1) {
                const colorArray = shapeLayer.shapes[0].it[fillIndex].c.k;
                if (colorArray && colorArray.length >= 3) {
                    color = rgbToHex(colorArray[0], colorArray[1], colorArray[2]);
                    console.log('Color encontrado:', color);
                }
            }
        }
    } catch (e) {
        console.error('Error extrayendo elementos:', e);
    }
    
    return { texto, color };
}

/**
 * Extraer valores específicos de gráfica 3 por nombre de capa
 */
function extraerElementosGrafica3(jsonData) {
    const elementos = {};
    
    // Extraer titulo_1 (texto)
    const titulo = jsonData.layers.find(l => l.nm === 'titulo_1');
    if (titulo && titulo.ty === 5 && titulo.t && titulo.t.d && titulo.t.d.k && titulo.t.d.k[0]) {
        elementos.titulo_1 = titulo.t.d.k[0].s.t;
    } else {
        elementos.titulo_1 = '';
    }
    
    // Extraer caja_texto (texto)
    const caja = jsonData.layers.find(l => l.nm === 'caja_texto');
    if (caja && caja.ty === 5 && caja.t && caja.t.d && caja.t.d.k && caja.t.d.k[0]) {
        elementos.caja_texto = caja.t.d.k[0].s.t;
    } else {
        elementos.caja_texto = '';
    }
    
    // Extraer foto_1 (imagen)
    const foto = jsonData.layers.find(l => l.nm === 'foto_1');
    if (foto && foto.ty === 2 && foto.refId) {
        elementos.foto_1 = foto.refId;
    } else {
        elementos.foto_1 = '';
    }
    
    return elementos;
}

/**
 * Extraer valores específicos de gráfica 4
 */
function extraerElementosGrafica4(jsonData) {
    const elementos = {};
    
    // Extraer titulo_1 (texto)
    const titulo = jsonData.layers.find(l => l.nm === 'titulo_1');
    if (titulo && titulo.ty === 5 && titulo.t && titulo.t.d && titulo.t.d.k && titulo.t.d.k[0]) {
        elementos.titulo_1 = titulo.t.d.k[0].s.t;
    } else {
        elementos.titulo_1 = '';
    }
    
    // Extraer caja_texto_1 (texto)
    const caja = jsonData.layers.find(l => l.nm === 'caja_texto_1');
    if (caja && caja.ty === 5 && caja.t && caja.t.d && caja.t.d.k && caja.t.d.k[0]) {
        elementos.caja_texto_1 = caja.t.d.k[0].s.t;
    } else {
        elementos.caja_texto_1 = '';
    }
    
    // Extraer color de barra_sombra
    const barraSombra = jsonData.layers.find(l => l.nm === 'barra_sombra');
    if (barraSombra && barraSombra.ty === 4 && barraSombra.shapes && barraSombra.shapes[0] && barraSombra.shapes[0].it) {
        const fillIndex = barraSombra.shapes[0].it.findIndex(item => item.ty === 'fl');
        if (fillIndex !== -1) {
            const colorArray = barraSombra.shapes[0].it[fillIndex].c.k;
            if (colorArray && colorArray.length >= 3) {
                elementos.barra_sombra = rgbToHex(colorArray[0], colorArray[1], colorArray[2]);
            }
        }
    }
    if (!elementos.barra_sombra) {
        elementos.barra_sombra = '#000000';
    }
    
    // Extraer color de full_barra
    const fullBarra = jsonData.layers.find(l => l.nm === 'full_barra');
    if (fullBarra && fullBarra.ty === 4 && fullBarra.shapes && fullBarra.shapes[0] && fullBarra.shapes[0].it) {
        const fillIndex = fullBarra.shapes[0].it.findIndex(item => item.ty === 'fl');
        if (fillIndex !== -1) {
            const colorArray = fullBarra.shapes[0].it[fillIndex].c.k;
            if (colorArray && colorArray.length >= 3) {
                elementos.full_barra = rgbToHex(colorArray[0], colorArray[1], colorArray[2]);
            }
        }
    }
    if (!elementos.full_barra) {
        elementos.full_barra = '#000000';
    }
    
    return elementos;
}

/**
 * Actualizar elementos en el JSON
 */
function actualizarElementosEnJson(jsonData, texto, color) {
    try {
        // Actualizar texto - buscar la capa de texto con contenido
        const textLayer = jsonData.layers.find(l => {
            if (l.ty === 5 && l.t && l.t.d && l.t.d.k && l.t.d.k[0]) {
                const textoLayer = l.t.d.k[0].s.t;
                return textoLayer && textoLayer.trim() !== '';
            }
            return false;
        });
        
        if (textLayer && textLayer.t && textLayer.t.d && textLayer.t.d.k) {
            // Actualizar TODOS los keyframes de texto
            for (let i = 0; i < textLayer.t.d.k.length; i++) {
                if (textLayer.t.d.k[i].s && textLayer.t.d.k[i].s.t !== undefined) {
                    textLayer.t.d.k[i].s.t = texto;
                }
            }
            
            // También actualizar el nombre de la capa para que sea consistente
            textLayer.nm = texto;
            
            console.log('Texto actualizado a:', texto);
            console.log('Nombre de capa actualizado a:', texto);
        }
        
        // Actualizar color - buscar la capa de forma
        const shapeLayer = jsonData.layers.find(l => {
            return l.ty === 4 && l.shapes && l.shapes.length > 0;
        });
        
        if (shapeLayer && shapeLayer.shapes && shapeLayer.shapes[0] && shapeLayer.shapes[0].it) {
            const fillIndex = shapeLayer.shapes[0].it.findIndex(item => item.ty === 'fl');
            if (fillIndex !== -1) {
                const rgb = hexToRgb(color);
                const currentAlpha = shapeLayer.shapes[0].it[fillIndex].c.k[3] || 1;
                shapeLayer.shapes[0].it[fillIndex].c.k = [...rgb, currentAlpha];
                console.log('Color actualizado a:', color, 'RGB:', rgb);
            }
        }
    } catch (e) {
        console.error('Error actualizando elementos:', e);
    }
    
    return jsonData;
}

/**
 * Actualizar elementos específicos de gráfica 3
 */
function actualizarElementosGrafica3(jsonData, titulo, caja, foto) {
    try {
        // Actualizar titulo_1
        const titleLayer = jsonData.layers.find(l => l.nm === 'titulo_1');
        if (titleLayer && titleLayer.ty === 5 && titleLayer.t && titleLayer.t.d && titleLayer.t.d.k) {
            for (let i = 0; i < titleLayer.t.d.k.length; i++) {
                if (titleLayer.t.d.k[i].s) {
                    titleLayer.t.d.k[i].s.t = titulo;
                }
            }
            console.log('Título actualizado a:', titulo);
        }
        
        // Actualizar caja_texto
        const cajaLayer = jsonData.layers.find(l => l.nm === 'caja_texto');
        if (cajaLayer && cajaLayer.ty === 5 && cajaLayer.t && cajaLayer.t.d && cajaLayer.t.d.k) {
            for (let i = 0; i < cajaLayer.t.d.k.length; i++) {
                if (cajaLayer.t.d.k[i].s) {
                    cajaLayer.t.d.k[i].s.t = caja;
                }
            }
            console.log('Caja de texto actualizada a:', caja);
        }
        
        // Actualizar foto_1
        const fotoLayer = jsonData.layers.find(l => l.nm === 'foto_1');
        if (fotoLayer && fotoLayer.ty === 2) {
            fotoLayer.refId = foto;
            console.log('Foto actualizada a:', foto);
        }
    } catch (e) {
        console.error('Error actualizando elementos de gráfica 3:', e);
    }
    
    return jsonData;
}

/**
 * Actualizar elementos específicos de gráfica 4
 */
function actualizarElementosGrafica4(jsonData, titulo, caja, barraSombra, fullBarra) {
    try {
        // Actualizar titulo_1
        const titleLayer = jsonData.layers.find(l => l.nm === 'titulo_1');
        if (titleLayer && titleLayer.ty === 5 && titleLayer.t && titleLayer.t.d && titleLayer.t.d.k) {
            for (let i = 0; i < titleLayer.t.d.k.length; i++) {
                if (titleLayer.t.d.k[i].s) {
                    titleLayer.t.d.k[i].s.t = titulo;
                }
            }
            console.log('Título actualizado a:', titulo);
        }
        
        // Actualizar caja_texto_1
        const cajaLayer = jsonData.layers.find(l => l.nm === 'caja_texto_1');
        if (cajaLayer && cajaLayer.ty === 5 && cajaLayer.t && cajaLayer.t.d && cajaLayer.t.d.k) {
            for (let i = 0; i < cajaLayer.t.d.k.length; i++) {
                if (cajaLayer.t.d.k[i].s) {
                    cajaLayer.t.d.k[i].s.t = caja;
                }
            }
            console.log('Caja de texto actualizada a:', caja);
        }
        
        // Actualizar color de barra_sombra
        const barraSombraLayer = jsonData.layers.find(l => l.nm === 'barra_sombra');
        if (barraSombraLayer && barraSombraLayer.ty === 4 && barraSombraLayer.shapes && barraSombraLayer.shapes[0]) {
            const fillIndex = barraSombraLayer.shapes[0].it.findIndex(item => item.ty === 'fl');
            if (fillIndex !== -1) {
                const rgb = hexToRgb(barraSombra);
                const currentAlpha = barraSombraLayer.shapes[0].it[fillIndex].c.k[3] || 1;
                barraSombraLayer.shapes[0].it[fillIndex].c.k = [...rgb, currentAlpha];
                console.log('Color barra sombra actualizado a:', barraSombra);
            }
        }
        
        // Actualizar color de full_barra
        const fullBarraLayer = jsonData.layers.find(l => l.nm === 'full_barra');
        if (fullBarraLayer && fullBarraLayer.ty === 4 && fullBarraLayer.shapes && fullBarraLayer.shapes[0]) {
            const fillIndex = fullBarraLayer.shapes[0].it.findIndex(item => item.ty === 'fl');
            if (fillIndex !== -1) {
                const rgb = hexToRgb(fullBarra);
                const currentAlpha = fullBarraLayer.shapes[0].it[fillIndex].c.k[3] || 1;
                fullBarraLayer.shapes[0].it[fillIndex].c.k = [...rgb, currentAlpha];
                console.log('Color barra principal actualizado a:', fullBarra);
            }
        }
    } catch (e) {
        console.error('Error actualizando elementos de gráfica 4:', e);
    }
    
    return jsonData;
}

/**
 * Abrir el modal editor JSON
 */
function abrirEditorJson(graficaId) {
    currentEditingGrafica = graficaId;
    const jsonData = graficasData[graficaId];
    
    // Mostrar campos simples por defecto
    document.getElementById('toggleAdvanced').checked = false;
    toggleAdvancedEditor();
    
    // Limpiar campo anterior
    const simpleFields = document.getElementById('simpleEditFields');
    simpleFields.innerHTML = '';
    
    if (graficaId === 3) {
        // GRÁFICA 3: Campos múltiples
        const elementos = extraerElementosGrafica3(jsonData);
        
        // Crear campo para titulo_1
        const titleDiv = document.createElement('div');
        titleDiv.className = 'form-group mb-3';
        titleDiv.innerHTML = `
            <label class="form-label">📝 ${config3.titulo_1.label}</label>
            <input type="text" id="titulo_1" class="form-control" value="${elementos.titulo_1 || ''}" />
        `;
        simpleFields.appendChild(titleDiv);
        
        // Crear campo para caja_texto
        const cajaDiv = document.createElement('div');
        cajaDiv.className = 'form-group mb-3';
        cajaDiv.innerHTML = `
            <label class="form-label">📝 ${config3.caja_texto.label}</label>
            <textarea id="caja_texto" class="form-control" rows="4">${elementos.caja_texto || ''}</textarea>
        `;
        simpleFields.appendChild(cajaDiv);
        
        // Crear campo para foto_1
        const fotoDiv = document.createElement('div');
        fotoDiv.className = 'form-group mb-3';
        fotoDiv.innerHTML = `
            <label class="form-label">🖼️ ${config3.foto_1.label}</label>
            <input type="text" id="foto_1" class="form-control" placeholder="Ingresa el ID de la imagen o 'images/nombre.jpg'" value="${elementos.foto_1 || ''}" />
        `;
        simpleFields.appendChild(fotoDiv);
        
    } else {
        // GRÁFICAS 1 y 2: Campos estándar (texto + color)
        const { texto, color } = extraerElementosEditables(jsonData);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'form-group mb-3';
        textDiv.innerHTML = `
            <label class="form-label">📝 Texto</label>
            <input type="text" id="textInput" class="form-control" value="${texto || ''}" />
        `;
        simpleFields.appendChild(textDiv);
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'form-group mb-3';
        colorDiv.innerHTML = `
            <label class="form-label">🎨 Color</label>
            <div class="d-flex gap-2 align-items-center">
                <input type="color" id="colorInput" class="form-control form-control-color" value="${color}" style="width: 100px; height: 40px;" />
                <input type="text" id="colorHex" class="form-control" placeholder="#000000" value="${color.toUpperCase()}" />
            </div>
        `;
        simpleFields.appendChild(colorDiv);
        
        // Event listeners para sincronizar colores
        document.getElementById('colorInput').addEventListener('change', () => {
            document.getElementById('colorHex').value = document.getElementById('colorInput').value.toUpperCase();
        });
        document.getElementById('colorHex').addEventListener('change', () => {
            const hex = document.getElementById('colorHex').value;
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
                document.getElementById('colorInput').value = hex;
            }
        });
    }
    
    // Llenar el editor JSON
    document.getElementById('jsonEditor').value = JSON.stringify(jsonData, null, 2);
    document.getElementById('editorMessage').innerHTML = '';
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

/**
 * Guardar el JSON editado (solo en memoria)
 */
function guardarJsonEditado() {
    const messageDiv = document.getElementById('editorMessage');
    
    try {
        let jsonData = graficasData[currentEditingGrafica];
        
        console.log('Iniciando guardado para gráfica:', currentEditingGrafica);
        
        if (document.getElementById('toggleAdvanced').checked) {
            // Modo avanzado: editar JSON completo
            const jsonText = document.getElementById('jsonEditor').value.trim();
            jsonData = JSON.parse(jsonText);
            console.log('Modo avanzado: JSON completo editado');
        } else {
            // Modo simple: actualizar solo los campos editables
            
            if (currentEditingGrafica === 3) {
                // GRÁFICA 3: Múltiples campos
                const titulo = document.getElementById('titulo_1').value;
                const caja = document.getElementById('caja_texto').value;
                const foto = document.getElementById('foto_1').value;
                
                console.log('Modo simple (Gráfica 3):');
                console.log('  Título:', titulo);
                console.log('  Caja:', caja);
                console.log('  Foto:', foto);
                
                // Validar que hay valores
                if (!titulo || !caja || !foto) {
                    messageDiv.innerHTML = '<div class="error-message">✗ Error: Todos los campos son obligatorios</div>';
                    return;
                }
                
                // Crear copia del JSON
                jsonData = JSON.parse(JSON.stringify(jsonData));
                jsonData = actualizarElementosGrafica3(jsonData, titulo, caja, foto);
                jsonData = actualizarElementosGrafica4(jsonData, titulo, caja, barraSombra, fullBarra) ;
                
            } else {
                // GRÁFICAS 1 y 2: Texto + Color
                const texto = document.getElementById('textInput').value;
                const color = document.getElementById('colorHex').value;
                
                console.log('Modo simple (Gráficas 1-2):');
                console.log('  Texto:', texto);
                console.log('  Color:', color);
                
                // Validar color
                if (!/^#[0-9A-F]{6}$/i.test(color)) {
                    messageDiv.innerHTML = '<div class="error-message">✗ Error: Código de color inválido</div>';
                    console.error('Color inválido:', color);
                    return;
                }
                
                // Crear copia del JSON para evitar problemas de referencia
                jsonData = JSON.parse(JSON.stringify(jsonData));
                jsonData = actualizarElementosEnJson(jsonData, texto, color);
            }
            
            console.log('Elementos actualizados en JSON');
        }
        
        // Guardar los datos en memoria
        graficasData[currentEditingGrafica] = jsonData;
        console.log('Datos guardados en graficasData');
        
        // Actualizar la animación en la tarjeta
        actualizarAnimacionGrafica(currentEditingGrafica, jsonData);
        
        // Mostrar mensaje de éxito
        messageDiv.innerHTML = '<div class="success-message">✓ Cambios guardados correctamente</div>';
        
        // Cerrar el modal después de 1.5 segundos
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modal) {
                modal.hide();
            }
        }, 1500);
        
    } catch (error) {
        console.error('Error al guardar:', error);
        messageDiv.innerHTML = `<div class="error-message">✗ Error: ${error.message}</div>`;
    }
}

/**
 * Actualizar la animación en la tarjeta con el JSON editado
 */
function actualizarAnimacionGrafica(graficaId, jsonData) {
    // Encontrar el lottie-player en la tarjeta
    const cards = document.querySelectorAll('.grafica-card');
    if (graficaId <= cards.length) {
        const player = cards[graficaId - 1].querySelector('lottie-player');
        if (player) {
            // Pausar y detener el player
            try {
                player.pause();
                player.stop();
            } catch (e) {
                console.log('Player controls not available');
            }
            
            // Limpiar el src anterior
            const oldUrl = player.src;
            if (oldUrl && oldUrl.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(oldUrl);
                } catch (e) {
                    console.log('Could not revoke old URL');
                }
            }
            
            // Cargar directamente el JSON en el player
            console.log('Actualizar: cargando JSON para gráfica', graficaId);
            
            if (typeof player.load === 'function') {
                console.log('Actualizar: usando load() para gráfica', graficaId);
                player.load(jsonData);
            } else if (typeof player.setAnimationData === 'function') {
                console.log('Actualizar: usando setAnimationData() para gráfica', graficaId);
                player.setAnimationData(jsonData);
            } else {
                // Fallback a src assignment con blob
                const jsonString = JSON.stringify(jsonData);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                console.log('Actualizar: usando src assignment para gráfica', graficaId);
                player.src = url;
            }
            
            // Reproducir después de un delay para que Lottie procese
            setTimeout(() => {
                try {
                    player.play();
                    console.log('Animación actualizada y reproducida para gráfica', graficaId);
                } catch (e) {
                    console.error('Error al reproducir después de actualizar:', e);
                }
            }, 300);
        }
    }
}

/**
 * Descargar el JSON
 */
function descargarJson(graficaId) {
    const jsonData = graficasData[graficaId];
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Crear un Blob y descargar
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grafica_${graficaId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Visualizar la animación en un modal
 */
function visualizarAnimacion(graficaId) {
    try {
        // Usar el JSON actualizado de graficasData
        const jsonData = graficasData[graficaId];
        
        if (!jsonData) {
            console.error('No se encontraron datos para la gráfica', graficaId);
            alert('Error: No se encontraron datos para visualizar');
            return;
        }
        
        console.log('Visualizando gráfica', graficaId);
        console.log('Datos a visualizar:', jsonData);
        
        // Obtener el player del modal
        const player = document.getElementById('modalLottiePlayer');
        
        if (!player) {
            console.error('No se encontró el lottie-player en el modal');
            alert('Error: Player no encontrado');
            return;
        }
        
        // Parar completamente el player antes de cambiar contenido
        try {
            player.pause();
            player.stop();
        } catch (e) {
            console.log('Player methods not yet available');
        }
        
        // Limpiar el src anterior y resetear estados
        try {
            if (player.src && player.src.startsWith('blob:')) {
                URL.revokeObjectURL(player.src);
            }
            player.src = '';
        } catch (e) {
            console.log('Could not clean player src');
        }
        
        // Cargar directamente el JSON en el player 
        console.log('Cargando JSON en modal player');
        console.log('jsonData:', jsonData);
        
        // Usar setAnimationData() que es el método directo para cargar JSON
        if (typeof player.setAnimationData === 'function') {
            console.log('Usando setAnimationData()');
            player.setAnimationData(jsonData);
        } else if (typeof player.load === 'function') {
            // load() espera una URL, así que crear un Blob primero
            console.log('Usando load() con Blob URL');
            const jsonString = JSON.stringify(jsonData);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            player.load(url);
        } else {
            // Fallback: asignar src directamente
            const jsonString = JSON.stringify(jsonData);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            console.log('Usando src assignment');
            player.src = url;
        }
        
        // Configurar propiedades de reproducción
        player.loop = true;
        player.autoplay = true;
        
        // Esperar a que Lottie procese y luego reproducir
        setTimeout(() => {
            try {
                console.log('Iniciando reproducción del modal');
                player.play();
            } catch (e) {
                console.error('Error al reproducir:', e);
            }
        }, 600);
        
        console.log('Player del modal configurado');
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('viewModal'));
        modal.show();
        
        console.log('Modal mostrado');
        
    } catch (error) {
        console.error('Error al visualizar:', error);
        alert('Error al visualizar: ' + error.message);
    }
}
