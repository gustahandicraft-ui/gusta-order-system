// =====================================================
// API
// =====================================================

const API =
  "https://script.google.com/macros/s/AKfycbw3Vyj9GMhbLPE01yeg2tLOuBU0q3AScZJ_mLtQPsu2441O065Al1F4RusGKbqCb6s5/exec?action=init";


// =====================================================
// DOM
// =====================================================

const select =
  document.getElementById(
    "customerSelect"
  );

const status =
  document.getElementById(
    "status"
  );

const loadOrderButton =
  document.getElementById(
    "loadOrder"
  );
const trackOrderButton =
  document.getElementById(
    "trackOrderButton"
  );

const trackingArea =
  document.getElementById(
    "trackingArea"
  );

const trackingContent =
  document.getElementById(
    "trackingContent"
  );
// =====================================================
// Track order button
// =====================================================

trackOrderButton
  .addEventListener(
    "click",
    async()=>{


      const orderId =
        select.value;


      if(!orderId){

        status.textContent =
          "請先選擇您的 LINE 名稱。";

        return;

      }


      status.textContent =
        "正在查詢訂單狀態...";


      trackOrderButton.disabled =
        true;


      try{

        const url =
          API.replace(
            "action=init",
            "action=order"
          )
          +
          "&orderId="
          +
          encodeURIComponent(
            orderId
          );


        const res =
          await fetch(url);


        if(!res.ok){

          throw new Error(
            "查詢訂單失敗"
          );

        }


        const data =
          await res.json();


        if(!data.success){

          throw new Error(
            data.message ||
            "找不到訂單"
          );

        }


        currentOrder =
          data;


        renderTrackingStatus(
          data
        );


        status.textContent =
          "";


        trackingArea.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });


      }
      catch(err){

        console.error(err);


        status.textContent =
          err.message ||
          "目前無法查詢訂單狀態。";


      }
      finally{

        trackOrderButton.disabled =
          false;

      }

    }
  );

// =====================================================
// System state
// =====================================================

let initialData = null;

let groupedAddons = null;

let currentOrder = null;

let addonCart = {};


// =====================================================
// Init
// =====================================================

async function init(){

  try{

    status.textContent =
      "正在載入訂單資料...";


    const res =
      await fetch(API);


    if(!res.ok){

      throw new Error(
        "無法連線至訂單系統"
      );

    }


    const data =
      await res.json();


    if(!data.success){

      throw new Error(
        data.message ||
        "API 回傳失敗"
      );

    }


    initialData = data;


    groupedAddons =
      groupAddonProducts(
        data.addons || []
      );


    console.log(
      "API 初始化資料：",
      data
    );

    console.log(
      "加購商品分組結果：",
      groupedAddons
    );


    select.innerHTML = `
      <option value="">
        請選擇您的 LINE 名稱
      </option>
    `;


    data.customers.forEach(
      customer => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          customer.orderId;

        option.textContent =
          customer.lineName;

        select.appendChild(
          option
        );

      }
    );


    status.textContent = "";

  }
  catch(err){

    console.error(err);

    status.textContent =
      "目前無法讀取訂單資料，請稍後再試。";

  }

}


// =====================================================
// Load order
// =====================================================

loadOrderButton
  .addEventListener(
    "click",
    async()=>{

      const orderId =
        select.value;


      if(!orderId){

        status.textContent =
          "請先選擇您的 LINE 名稱。";

        return;

      }


      status.textContent =
        "正在讀取訂單...";


      loadOrderButton.disabled =
        true;


      try{

        const url =
          API.replace(
            "action=init",
            "action=order"
          )
          +
          "&orderId="
          +
          encodeURIComponent(
            orderId
          );


        const res =
          await fetch(url);


        if(!res.ok){

          throw new Error(
            "讀取訂單失敗"
          );

        }


        const data =
          await res.json();


        if(!data.success){

          throw new Error(
            data.message ||
            "找不到訂單"
          );

        }


currentOrder = data;

addonCart = {};


// =====================================================
// 已確認訂單：鎖定，不可再次修改
// =====================================================

if(
  data.master.confirmStatus === "已確認"
){

  // 隱藏編輯訂單區
  document
    .getElementById("orderArea")
    .classList.add("hidden");


  // 隱藏成功頁（避免之前操作殘留）
  document
    .getElementById("successArea")
    .classList.add("hidden");


  // 直接顯示訂單狀態
  renderTrackingStatus(data);


  status.textContent =
    "此訂單已完成確認，如需修改請聯絡 Gusta。";


  trackingArea.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });


  return;
}


// =====================================================
// 尚未確認：正常進入訂單確認流程
// =====================================================

// 如果之前看過狀態，先收起來
trackingArea
  .classList
  .add("hidden");


renderOrder(data);

renderAllAddons();

renderShipping();

renderSummary();


document
  .getElementById("submitArea")
  .classList.remove("hidden");


status.textContent = "";

      }
      catch(err){

        console.error(err);

        status.textContent =
          err.message ||
          "讀取訂單失敗，請稍後再試。";

      }
      finally{

        loadOrderButton.disabled =
          false;

      }

    }
  );


// =====================================================
// Render original order
// =====================================================

function renderOrder(data){

  const master =
    data.master;

  const items =
    data.items || [];


  document
    .getElementById(
      "customerName"
    )
    .textContent =
      `${master.lineName}，您好`;


  document
    .getElementById(
      "orderId"
    )
    .textContent =
      `訂單編號 ${master.orderId}`;


  const groupedItems = {};


  items.forEach(item=>{

    const productName =
      String(
        item.product || ""
      ).trim();


    if(
      !groupedItems[
        productName
      ]
    ){

      groupedItems[
        productName
      ] = [];

    }


    groupedItems[
      productName
    ].push(item);

  });


  const itemBox =
    document.getElementById(
      "orderItems"
    );


  itemBox.innerHTML = "";


  Object
    .entries(groupedItems)
    .forEach(
      ([
        productName,
        productItems
      ])=>{


        const group =
          document.createElement(
            "div"
          );


        group.className =
          "product-group";


        const title =
          document.createElement(
            "div"
          );


        title.className =
          "product-title";


        title.textContent =
          productName;


        group.appendChild(
          title
        );


        productItems.forEach(
          item=>{

            const row =
              document.createElement(
                "div"
              );


            row.className =
              "product-variant";


            row.innerHTML = `

              <div>

                <div class="variant-spec">
                  ${escapeHtml(
                    item.spec
                  )}
                </div>

                <div class="variant-qty">
                  × ${Number(
                    item.qty
                  )}
                </div>

              </div>


              <div class="variant-price">
                NT$ ${money(
                  item.subtotal
                )}
              </div>

            `;


            group.appendChild(
              row
            );

          }
        );


        itemBox.appendChild(
          group
        );

      }
    );


  document
    .getElementById(
      "originalTotal"
    )
    .textContent =
      "NT$ " +
      money(
        master.originalTotal
      );


  document
    .getElementById(
      "orderArea"
    )
    .classList.remove(
      "hidden"
    );

}
// =====================================================
// Render tracking status
// =====================================================

function renderTrackingStatus(data){

  const master =
    data.master;


  const confirmDone =
    master.confirmStatus ===
    "已確認";


  const paymentDone =
    master.paymentStatus ===
    "已付款";


  const shippingDone =
    master.shippingStatus ===
    "已出貨";


  const confirmText =
    confirmDone
      ? "已確認"
      : "尚未確認";


  const paymentText =
    paymentDone
      ? "已付款"
      : "等待付款";


  const shippingText =
    shippingDone
      ? "已出貨"
      : "尚未出貨";


  const trackingNumber =
    String(
      master.trackingNumber || ""
    ).trim();


  const shippedAt =
    master.shippedAt || "";


  trackingContent.innerHTML = `
<div class="tracking-locked-notice">

  <strong>
    ✓ 此訂單已完成確認
  </strong>

  <p>
    訂單內容已鎖定，如需修改請直接聯絡 Gusta。
  </p>

</div>

    <div class="tracking-order-head">

      <div>

        <div class="muted">
          訂單編號
        </div>

        <strong>
          ${escapeHtml(
            master.orderId
          )}
        </strong>

      </div>

      <div class="tracking-total">

        <div class="muted">
          應付金額
        </div>

        <strong>
          NT$${money(
            master.payableTotal
          )}
        </strong>

      </div>

    </div>


    <div class="tracking-progress">

      ${renderTrackingStep(
        "訂單確認",
        confirmDone,
        confirmText
      )}

      ${renderTrackingStep(
        "付款狀態",
        paymentDone,
        paymentText
      )}

      ${renderTrackingStep(
        "出貨狀態",
        shippingDone,
        shippingText
      )}

    </div>


    <div class="tracking-detail">

      <div class="tracking-row">

        <span>
          運送方式
        </span>

        <strong>
          ${escapeHtml(
            master.shippingMethod ||
            "尚未選擇"
          )}
        </strong>

      </div>


      ${
        trackingNumber
          ? `

            <div class="tracking-row">

              <span>
                物流單號
              </span>

              <strong>
                ${escapeHtml(
                  trackingNumber
                )}
              </strong>

            </div>

          `
          : `

            <div class="tracking-row">

              <span>
                物流單號
              </span>

              <strong class="muted">
                尚未建立
              </strong>

            </div>

          `
      }


      ${
        shippedAt
          ? `

            <div class="tracking-row">

              <span>
                出貨時間
              </span>

              <strong>
             ${escapeHtml(
  formatDateTime(shippedAt)
)}
              </strong>

            </div>

          `
          : ""
      }

    </div>

  `;


  trackingArea
    .classList
    .remove(
      "hidden"
    );

}
function renderTrackingStep(
  label,
  done,
  text
){

  return `

    <div class="tracking-step">

      <div class="
        tracking-dot
        ${done ? "done" : ""}
      ">

        ${done ? "✓" : ""}

      </div>

      <div class="tracking-step-text">

        <span>
          ${escapeHtml(label)}
        </span>

        <strong>
          ${escapeHtml(text)}
        </strong>

      </div>

    </div>

  `;

}


// =====================================================
// Group addon products
// =====================================================

function groupAddonProducts(addons){

  const groups = {};


  addons.forEach(item=>{

    const name =
      String(
        item.name || ""
      ).trim();


    const spec =
      String(
        item.spec || ""
      ).trim();


    // Elastic Shaft

    if(
      name.includes(
        "彈性軸"
      )
    ){

      if(
        !groups.elastic
      ){

        groups.elastic = {

          title:
            "Smile Yarn Holder 專用彈性軸",

          options:[]

        };

      }


      let label =
        spec;


      if(!label){

        if(
          name.includes(
            "加長"
          )
        ){

          label = "加長";

        }
        else if(
          name.includes(
            "標準"
          )
        ){

          label = "標準";

        }
        else{

          label = name;

        }

      }


      groups
        .elastic
        .options
        .push({

          id:item.id,

          label,

          price:
            Number(
              item.price
            ) || 0

        });


      return;

    }


    // Keyring

    if(
      name.includes(
        "收納鑰匙圈"
      )
    ){

      if(
        !groups.keyring
      ){

        groups.keyring = {

          title:
            "桶線造型收納鑰匙圈",

          colors:[]

        };

      }


      groups
        .keyring
        .colors
        .push({

          id:item.id,

          color:spec,

          price:
            Number(
              item.price
            ) || 0

        });


      return;

    }


    // Clicker

    if(
      name.includes(
        "舒壓按鍵"
      )
    ){

      if(
        !groups.clicker
      ){

        groups.clicker = {

          title:
            "桶線造型舒壓按鍵吊飾",

          modes:{}

        };

      }


      let mode =
        "其他";


      if(
        name.includes(
          "高亢"
        )
      ){

        mode = "高亢";

      }
      else if(
        name.includes(
          "低沉"
        )
      ){

        mode = "低沉";

      }


      if(
        !groups
          .clicker
          .modes[
            mode
          ]
      ){

        groups
          .clicker
          .modes[
            mode
          ] = [];

      }


      groups
        .clicker
        .modes[
          mode
        ]
        .push({

          id:item.id,

          color:spec,

          price:
            Number(
              item.price
            ) || 0

        });


      return;

    }

  });


  return groups;

}


// =====================================================
// Render addons
// =====================================================

function renderAllAddons(){

  const root =
    document.getElementById(
      "addonContainer"
    );


  root.innerHTML = "";


  if(
    groupedAddons.elastic
  ){

    root.appendChild(

      createAddonSelector(

        groupedAddons
          .elastic
          .title,

        groupedAddons
          .elastic
          .options
          .map(item=>({

            id:item.id,

            label:
              item.label,

            price:
              item.price

          }))

      )

    );

  }


  if(
    groupedAddons.keyring
  ){

    root.appendChild(

      createAddonSelector(

        groupedAddons
          .keyring
          .title,

        groupedAddons
          .keyring
          .colors
          .map(item=>({

            id:item.id,

            label:
              item.color,

            price:
              item.price

          }))

      )

    );

  }


  if(
    groupedAddons.clicker
  ){

    Object
      .entries(
        groupedAddons
          .clicker
          .modes
      )
      .forEach(
        ([mode,colors])=>{

          root.appendChild(

            createAddonSelector(

              `${groupedAddons.clicker.title}｜${mode}`,

              colors.map(
                item=>({

                  id:item.id,

                  label:
                    item.color,

                  price:
                    item.price

                })
              )

            )

          );

        }
      );

  }


  document
    .getElementById(
      "addonArea"
    )
    .classList.remove(
      "hidden"
    );

}


// =====================================================
// Create addon selector
// =====================================================

function createAddonSelector(
  title,
  options
){

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "addon-card";


  wrapper.innerHTML = `

    <div class="addon-title">
      ${escapeHtml(title)}
    </div>

    <div class="addon-field-label">
      規格
    </div>

    <select>

      ${options.map(
        item=>`

          <option
            value="${item.id}"
            data-price="${item.price}"
            data-label="${escapeHtml(
              item.label
            )}"
          >
            ${escapeHtml(
              item.label
            )}
            （NT$${money(
              item.price
            )}）
          </option>

        `
      ).join("")}

    </select>


    <div class="addon-action-row">

      <div class="qty-control">

        <button
          type="button"
          class="qty-btn qty-minus"
        >
          −
        </button>

        <span class="qty-value">
          1
        </span>

        <button
          type="button"
          class="qty-btn qty-plus"
        >
          ＋
        </button>

      </div>


      <button
        type="button"
        class="add-button"
      >
        加入
      </button>

    </div>

  `;


  let qty = 1;


  const qtyValue =
    wrapper.querySelector(
      ".qty-value"
    );


  wrapper
    .querySelector(
      ".qty-minus"
    )
    .addEventListener(
      "click",
      ()=>{

        qty =
          Math.max(
            1,
            qty - 1
          );


        qtyValue.textContent =
          qty;

      }
    );


  wrapper
    .querySelector(
      ".qty-plus"
    )
    .addEventListener(
      "click",
      ()=>{

        qty++;

        qtyValue.textContent =
          qty;

      }
    );


  wrapper
    .querySelector(
      ".add-button"
    )
    .addEventListener(
      "click",
      ()=>{

        const addonSelect =
          wrapper.querySelector(
            "select"
          );


        const selected =
          addonSelect.options[
            addonSelect.selectedIndex
          ];


        addAddonToCart({

          id:
            selected.value,

          name:
            title,

          spec:
            selected.dataset.label,

          price:
            Number(
              selected.dataset.price
            ),

          qty

        });

      }
    );


  return wrapper;

}


// =====================================================
// Add to addon cart
// =====================================================

function addAddonToCart(item){

  if(
    addonCart[
      item.id
    ]
  ){

    addonCart[
      item.id
    ].qty +=
      item.qty;

  }
  else{

    addonCart[
      item.id
    ] = {
      ...item
    };

  }


  renderAddonCart();

  renderSummary();

}


// =====================================================
// Render addon cart
// =====================================================

function renderAddonCart(){

  const area =
    document.getElementById(
      "addonCartArea"
    );


  const root =
    document.getElementById(
      "addonCart"
    );


  const items =
    Object.values(
      addonCart
    );


  if(
    items.length === 0
  ){

    area.classList.add(
      "hidden"
    );

    root.innerHTML = "";

    return;

  }


  area.classList.remove(
    "hidden"
  );


  root.innerHTML = "";


  items.forEach(item=>{

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "cart-item";


    row.innerHTML = `

      <div>

        <div class="cart-item-name">
          ${escapeHtml(
            item.name
          )}
        </div>

        <div class="cart-item-spec">
          ${escapeHtml(
            item.spec
          )}
          × ${item.qty}
        </div>

      </div>


      <div class="cart-item-right">

        <strong>
          NT$${money(
            item.price *
            item.qty
          )}
        </strong>

        <button
          type="button"
          class="remove-addon"
        >
          移除
        </button>

      </div>

    `;


    row
      .querySelector(
        ".remove-addon"
      )
      .addEventListener(
        "click",
        ()=>{

          delete addonCart[
            item.id
          ];


          renderAddonCart();

          renderSummary();

        }
      );


    root.appendChild(
      row
    );

  });

}


// =====================================================
// Shipping
// =====================================================

function renderShipping(){

  if(!initialData){
    return;
  }


  const root =
    document.getElementById(
      "shippingOptions"
    );


  root.innerHTML = "";


  initialData.shipping.forEach(
    shipping => {

      const label =
        document.createElement(
          "label"
        );


      label.className =
        "shipping-option";


      label.innerHTML = `

        <div class="shipping-left">

          <input
            type="radio"
            name="shipping"
            value="${escapeHtml(shipping.name)}"
            data-price="${shipping.price}"
          >

          <span>
            ${escapeHtml(shipping.name)}
          </span>

        </div>


        <strong>

          ${
            shipping.price > 0
              ? "NT$" + money(shipping.price)
              : "免費"
          }

        </strong>

      `;


      root.appendChild(
        label
      );

    }
  );


  root
    .querySelectorAll(
      'input[name="shipping"]'
    )
    .forEach(
      input => {

        input.addEventListener(
          "change",
          () => {

            updateReceiverFields();

            renderSummary();

          }
        );

      }
    );


  document
    .getElementById(
      "shippingArea"
    )
    .classList.remove(
      "hidden"
    );

}
// =====================================================
// Receiver fields
// =====================================================

function updateReceiverFields(){

  const shipping =
    getSelectedShipping();


  const receiverArea =
    document.getElementById(
      "receiverArea"
    );


  const receiver711 =
    document.getElementById(
      "receiver711"
    );


  const receiverMail =
    document.getElementById(
      "receiverMail"
    );


  // 還沒選運送方式
  if(!shipping){

    receiverArea
      .classList
      .add("hidden");

    return;

  }


  // 有選就顯示收件資料
  receiverArea
    .classList
    .remove("hidden");


  // 先全部隱藏
  receiver711
    .classList
    .add("hidden");

  receiverMail
    .classList
    .add("hidden");

// 切換運送方式時，不相關欄位先保留內容
// 目前不清除，避免客人誤觸後資料消失
  // 7-11 店到店
  if(
    shipping.name ===
    "7-11 店到店"
  ){

    receiver711
      .classList
      .remove("hidden");

  }


  // 郵寄
  else if(
    shipping.name ===
    "郵寄"
  ){

    receiverMail
      .classList
      .remove("hidden");

  }


  // 工作室自取
  // 不需要另外顯示地址欄
}

// =====================================================
// Selected shipping
// =====================================================

function getSelectedShipping(){

  const input =
    document.querySelector(
      'input[name="shipping"]:checked'
    );


  if(!input){

    return null;

  }


  return {

    name:
      input.value,

    price:
      Number(
        input.dataset.price
      ) || 0

  };

}


// =====================================================
// Addon total
// =====================================================

function getAddonTotal(){

  return Object
    .values(
      addonCart
    )
    .reduce(
      (sum,item)=>
        sum +
        item.price *
        item.qty,
      0
    );

}


// =====================================================
// Summary
// =====================================================

function renderSummary(){

  if(!currentOrder){

    return;

  }


  const original =
    Number(
      currentOrder
        .master
        .originalTotal
    ) || 0;


  const addonTotal =
    getAddonTotal();


  const shipping =
    getSelectedShipping();


  const shippingFee =
    shipping
      ? shipping.price
      : 0;


  const total =
    original +
    addonTotal +
    shippingFee;


  document
    .getElementById(
      "summaryOriginal"
    )
    .textContent =
      "NT$" +
      money(original);


  document
    .getElementById(
      "summaryAddon"
    )
    .textContent =
      "NT$" +
      money(addonTotal);


  document
    .getElementById(
      "summaryShipping"
    )
    .textContent =
      shipping
        ?
        "NT$" +
        money(
          shipping.price
        )
        :
        "尚未選擇";


  document
    .getElementById(
      "summaryTotal"
    )
    .textContent =
      "NT$" +
      money(total);


  document
    .getElementById(
      "summaryArea"
    )
    .classList.remove(
      "hidden"
    );

}
// =====================================================
// Validate order
// =====================================================

function validateOrder(){

  if(!currentOrder){

    return {
      valid:false,
      message:"找不到目前訂單。"
    };

  }


  const shipping =
    getSelectedShipping();


  if(!shipping){

    return {
      valid:false,
      message:"請選擇運送方式。"
    };

  }


  const recipientName =
    document
      .getElementById("recipientName")
      .value
      .trim();


  const phone =
    document
      .getElementById("recipientPhone")
      .value
      .trim();


  if(!recipientName){

    return {
      valid:false,
      message:"請填寫收件人姓名。"
    };

  }


  if(!phone){

    return {
      valid:false,
      message:"請填寫手機號碼。"
    };

  }


  if(
    !/^09\d{8}$/.test(phone)
  ){

    return {
      valid:false,
      message:"請確認手機號碼是否正確。"
    };

  }


  if(
    shipping.name ===
    "7-11 店到店"
  ){

    const store =
      document
        .getElementById("store711")
        .value
        .trim();


    if(!store){

      return {
        valid:false,
        message:"請填寫 7-11 門市。"
      };

    }

  }


  if(
    shipping.name ===
    "郵寄"
  ){

    const address =
      document
        .getElementById("mailAddress")
        .value
        .trim();


    if(!address){

      return {
        valid:false,
        message:"請填寫郵寄地址。"
      };

    }

  }


  const confirmed =
    document
      .getElementById("confirmCheck")
      .checked;


  if(!confirmed){

    return {
      valid:false,
      message:"請勾選確認訂單內容。"
    };

  }


  return {
    valid:true
  };

}
// =====================================================
// Build submit payload
// =====================================================

function buildOrderPayload(){

  const shipping =
    getSelectedShipping();


  return {

    action:"confirm",

    orderId:
      currentOrder
        .master
        .orderId,


    addons:
      Object
        .values(addonCart)
        .map(item=>({

          id:item.id,

          qty:item.qty

        })),


    shippingMethod:
      shipping.name,


    recipientName:
      document
        .getElementById("recipientName")
        .value
        .trim(),


    phone:
      document
        .getElementById("recipientPhone")
        .value
        .trim(),


    postalCode:
      document
        .getElementById("postalCode")
        .value
        .trim(),


    address:
      document
        .getElementById("mailAddress")
        .value
        .trim(),


    store711:
      document
        .getElementById("store711")
        .value
        .trim(),


    paymentLast5:
      document
        .getElementById("paymentLast5")
        .value
        .trim(),


    note:
      document
        .getElementById("orderNote")
        .value
        .trim()

  };

}
// =====================================================
// Submit order
// =====================================================

document
  .getElementById(
    "submitOrderButton"
  )
  .addEventListener(
    "click",
    async()=>{


      const check =
        validateOrder();


      const submitStatus =
        document.getElementById(
          "submitStatus"
        );


      if(!check.valid){

        submitStatus.textContent =
          check.message;

        return;

      }


      const button =
        document.getElementById(
          "submitOrderButton"
        );


      button.disabled = true;

      button.textContent =
        "送出中...";


      submitStatus.textContent =
        "";


      try{

        const payload =
          buildOrderPayload();


        const postUrl =
          API.split("?")[0];


        const res =
          await fetch(
            postUrl,
            {

              method:"POST",

              headers:{
                "Content-Type":
                  "text/plain;charset=utf-8"
              },

              body:
                JSON.stringify(
                  payload
                )

            }
          );


        const result =
          await res.json();


        if(!result.success){

          throw new Error(
            result.message ||
            "訂單送出失敗"
          );

        }


        showSuccess(
          result
        );


      }
      catch(err){

        console.error(err);


        submitStatus.textContent =
          err.message ||
          "送出失敗，請稍後再試。";


        button.disabled =
          false;


        button.textContent =
          "確認訂單";

      }

    }
  );
// =====================================================
// Success
// =====================================================

function showSuccess(result){

  // 隱藏原本操作區

  document
    .getElementById(
      "searchCard"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "orderArea"
    )
    .classList.add(
      "hidden"
    );


  // 顯示訂單編號

  document
    .getElementById(
      "successOrderId"
    )
    .textContent =
      result.orderId;


  // 顯示應付金額

  document
    .getElementById(
      "successTotal"
    )
    .textContent =
      "NT$" +
      money(
        result.payableTotal
      );


  // 顯示完成頁

  const area =
    document.getElementById(
      "successArea"
    );


  area.classList.remove(
    "hidden"
  );


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}
// =====================================================
// Copy bank account
// =====================================================

const BANK_ACCOUNT =
  "82110000537372";

const copyBankButton =
  document.getElementById(
    "copyBankButton"
  );


if(copyBankButton){

  copyBankButton
    .addEventListener(
      "click",
      async()=>{

        const copyStatus =
          document.getElementById(
            "copyBankStatus"
          );


        try{

          await navigator
            .clipboard
            .writeText(
              BANK_ACCOUNT
            );


          copyStatus.textContent =
            "✓ 帳號已複製";


          setTimeout(
            ()=>{

              copyStatus.textContent =
                "";

            },
            2500
          );


        }
        catch(err){

          console.error(err);


          copyStatus.textContent =
            "請手動複製：82110000537372";

        }

      }
    );

}
document
  .getElementById(
    "copyAccountButton"
  )
  .addEventListener(
    "click",
    async()=>{

      const copyStatus =
        document.getElementById(
          "copyStatus"
        );


      try{

        await navigator
          .clipboard
          .writeText(
            BANK_ACCOUNT
          );


        copyStatus.textContent =
          "✓ 帳號已複製";


        setTimeout(
          ()=>{

            copyStatus.textContent =
              "";

          },
          2500
        );

      }
      catch(err){

        console.error(err);


        // 本機 file:// 測試時
        // Clipboard API 有時會被瀏覽器擋住
        copyStatus.textContent =
          "請長按帳號複製：82110000537372";

      }

    }
  );

// =====================================================
// Helpers
// =====================================================

function money(value){

  return Number(
    value || 0
  )
  .toLocaleString(
    "zh-TW"
  );

}


function escapeHtml(text){

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    text == null
      ? ""
      : String(text);


  return div.innerHTML;

}
function formatDateTime(value){

  if(!value){
    return "";
  }

  const date =
    new Date(value);

  return date.toLocaleString(
    "zh-TW",
    {
      year:"numeric",
      month:"2-digit",
      day:"2-digit",
      hour:"2-digit",
      minute:"2-digit",
      hour12:false,
      timeZone:"Asia/Taipei"
    }
  );

}

// =====================================================
// Start
// =====================================================

init();