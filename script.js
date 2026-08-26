// =====================================================
// API
// =====================================================

const API_BASE =
  "https://script.google.com/macros/s/AKfycbw3Vyj9GMhbLPE01yeg2tLOuBU0q3AScZJ_mLtQPsu2441O065Al1F4RusGKbqCb6s5/exec";


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

const orderArea =
  document.getElementById(
    "orderArea"
  );


// =====================================================
// System state
// =====================================================

let initialData = null;

let groupedAddons = {};

let currentOrder = null;

let addonCart = {};

let campaigns = [];

let selectedCampaign = null;


// =====================================================
// Campaign selector
// =====================================================

function createCampaignSelector(){

  if(
    document.getElementById(
      "campaignSelect"
    )
  ){
    return;
  }


  const searchCard =
    document.getElementById(
      "searchCard"
    );


  const customerLabel =
    document.querySelector(
      'label[for="customerSelect"]'
    );


  const block =
    document.createElement(
      "div"
    );


  block.id =
    "campaignBlock";


  block.innerHTML = `

    <label for="campaignSelect">
      團購活動
    </label>

    <select id="campaignSelect">

      <option value="">
        正在載入團購活動...
      </option>

    </select>


    <div
      id="campaignInfo"
      class="campaign-info hidden"
    ></div>

  `;


  if(customerLabel){

    searchCard.insertBefore(
      block,
      customerLabel
    );

  }
  else{

    searchCard.prepend(
      block
    );

  }


  document
    .getElementById(
      "campaignSelect"
    )
    .addEventListener(
      "change",
      handleCampaignChange
    );

}


// =====================================================
// Init
// =====================================================

async function init(){

  createCampaignSelector();

  resetCustomerSelector();


  try{

    status.textContent =
      "正在載入團購資料...";


    const res =
      await fetch(
        `${API_BASE}?action=init`
      );


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


    initialData =
      data;


    campaigns =
      Array.isArray(
        data.campaigns
      )
        ? data.campaigns
        : [];


    groupedAddons = {};


    console.log(
      "API 初始化資料：",
      data
    );


    console.log(
      "團購活動：",
      campaigns
    );


    console.log(
      "加購商品分組：",
      groupedAddons
    );


    renderCampaignSelector();


    if(
      campaigns.length === 0
    ){

      status.textContent =
        "目前沒有可查詢的團購活動。";

      return;

    }


    status.textContent =
      "";

  }
  catch(err){

    console.error(err);


    status.textContent =
      err.message ||
      "目前無法讀取團購資料，請稍後再試。";

  }

}


// =====================================================
// Render campaign selector
// =====================================================

function renderCampaignSelector(){

  const campaignSelect =
    document.getElementById(
      "campaignSelect"
    );


  if(!campaignSelect){
    return;
  }


  campaignSelect.innerHTML =
    "";


  // =====================================================
  // 沒有活動
  // =====================================================

  if(
    campaigns.length === 0
  ){

    const option =
      document.createElement(
        "option"
      );


    option.value =
      "";


    option.textContent =
      "目前沒有可查詢的團購活動";


    campaignSelect.appendChild(
      option
    );


    campaignSelect.disabled =
      true;


    selectedCampaign =
      null;


    resetCustomerSelector();


    renderCampaignInfo(
      null
    );


    return;

  }


  campaignSelect.disabled =
    false;


  // =====================================================
  // 只有一個活動
  // =====================================================

  if(
    campaigns.length === 1
  ){

    const campaign =
      campaigns[0];


    const option =
      document.createElement(
        "option"
      );


    option.value =
      campaign.campaignCode;


    const dateRange =
      formatCampaignRange(
        campaign.startDate,
        campaign.endDate
      );


    option.textContent =
      dateRange
        ? `${campaign.campaignName}｜${dateRange}`
        : campaign.campaignName;


    campaignSelect.appendChild(
      option
    );


    campaignSelect.value =
      campaign.campaignCode;


    selectedCampaign =
      campaign;


    renderCampaignInfo(
      campaign
    );


    try{

      localStorage.setItem(
        "gustaLastCampaign",
        campaign.campaignCode
      );

    }
    catch(err){

      console.warn(
        "無法儲存團購活動",
        err
      );

    }


campaignSelect.dispatchEvent(
  new Event(
    "change"
  )
);


return;

  }


  // =====================================================
  // 多個活動
  // =====================================================

  const placeholder =
    document.createElement(
      "option"
    );


  placeholder.value =
    "";


  placeholder.textContent =
    "請選擇團購活動";


  campaignSelect.appendChild(
    placeholder
  );


  campaigns.forEach(
    campaign=>{

      const option =
        document.createElement(
          "option"
        );


      option.value =
        campaign.campaignCode;


      const dateRange =
        formatCampaignRange(
          campaign.startDate,
          campaign.endDate
        );


      option.textContent =
        dateRange
          ? `${campaign.campaignName}｜${dateRange}`
          : campaign.campaignName;


      campaignSelect.appendChild(
        option
      );

    }
  );


  // =====================================================
// 預設不選擇任何團購活動
// =====================================================

campaignSelect.value = "";

selectedCampaign = null;

resetCustomerSelector();

renderCampaignInfo(null);

}

// =====================================================
// Campaign changed
// =====================================================

async function handleCampaignChange(
  event
){

  const campaignCode =
    event.target.value;


  hideCurrentOrder();


  if(!campaignCode){

    selectedCampaign =
      null;


    groupedAddons =
      {};


    addonCart =
      {};


    resetCustomerSelector();


    renderCampaignInfo(
      null
    );


    return;

  }


  selectedCampaign =
    campaigns.find(
      campaign =>
        String(
          campaign.campaignCode
        ) ===
        String(
          campaignCode
        )
    ) || null;


  try{

    // 加購商品與訂單名單同時讀取
    const [
      campaignAddons
    ] = await Promise.all([

      getCampaignAddons(
        campaignCode
      ),

      loadCampaignCustomers(
        campaignCode
      )

    ]);


    groupedAddons =
      groupAddonProducts(
        campaignAddons
      );


    addonCart =
      {};


    renderCampaignInfo(
      selectedCampaign
    );

  }
  catch(err){

    console.error(err);


    groupedAddons =
      {};


    addonCart =
      {};


    status.textContent =
      err.message ||
      "目前無法載入這個團購資料。";


    resetCustomerSelector();

  }

}

function renderCampaignInfo(){

  const campaignInfo =
    document.getElementById(
      "campaignInfo"
    );

  if(!campaignInfo){
    return;
  }

  campaignInfo.innerHTML = "";

  campaignInfo.classList.add(
    "hidden"
  );

}
// =====================================================
// Load customers for campaign
// =====================================================

async function loadCampaignCustomers(
  campaignCode
){

  resetCustomerSelector();


  status.textContent =
    "正在載入這一團的訂單名單...";


  try{

    const url =
      `${API_BASE}?action=customers`
      +
      `&campaignCode=${encodeURIComponent(
        campaignCode
      )}`;


    const res =
      await fetch(
        url
      );


    if(!res.ok){

      throw new Error(
        "無法讀取訂單名單"
      );

    }


    const data =
      await res.json();


    if(!data.success){

      throw new Error(
        data.message ||
        "訂單名單讀取失敗"
      );

    }


    const customers =
      Array.isArray(
        data.customers
      )
        ? data.customers
        : [];


    select.innerHTML = `

      <option value="">
        請選擇您的 LINE 名稱
      </option>

    `;


    customers.forEach(
      customer=>{

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


    select.disabled =
      false;


    loadOrderButton.disabled =
      false;


    trackOrderButton.disabled =
      false;


    if(
      customers.length === 0
    ){

      status.textContent =
        "這個團購目前沒有可查詢的訂單。";

    }
    else{

      status.textContent =
        "";

    }

  }
  catch(err){

    console.error(err);


    status.textContent =
      err.message ||
      "目前無法讀取這個團購的訂單名單。";


    resetCustomerSelector();

  }

}


// =====================================================
// Reset customer selector
// =====================================================

function resetCustomerSelector(){

  select.innerHTML = `

    <option value="">
      請先選擇團購活動
    </option>

  `;


  select.disabled =
    true;


  loadOrderButton.disabled =
    true;


  trackOrderButton.disabled =
    true;


  currentOrder =
    null;


  addonCart =
    {};

}


// =====================================================
// Hide previous order
// =====================================================

function hideCurrentOrder(){

  if(orderArea){

    orderArea.classList.add(
      "hidden"
    );

  }


  if(trackingArea){

    trackingArea.classList.add(
      "hidden"
    );

  }


  const successArea =
    document.getElementById(
      "successArea"
    );


  if(successArea){

    successArea.classList.add(
      "hidden"
    );

  }


  status.textContent =
    "";

}


// =====================================================
// Track order button
// =====================================================

trackOrderButton
  .addEventListener(
    "click",
    async()=>{

      const orderId =
        select.value;


      if(!selectedCampaign){

        status.textContent =
          "請先選擇團購活動。";

        return;

      }


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
          `${API_BASE}?action=order`
          +
          `&orderId=${encodeURIComponent(
            orderId
          )}`
          +
          `&campaignCode=${encodeURIComponent(
            selectedCampaign.campaignCode
          )}`;


        const res =
          await fetch(
            url
          );


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


        orderArea.classList.add(
          "hidden"
        );


        const successArea =
          document.getElementById(
            "successArea"
          );


        if(successArea){

          successArea.classList.add(
            "hidden"
          );

        }


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
// Load order
// =====================================================

loadOrderButton
  .addEventListener(
    "click",
    async()=>{

      const orderId =
        select.value;


      if(!selectedCampaign){

        status.textContent =
          "請先選擇團購活動。";

        return;

      }


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
          `${API_BASE}?action=order`
          +
          `&orderId=${encodeURIComponent(
            orderId
          )}`
          +
          `&campaignCode=${encodeURIComponent(
            selectedCampaign.campaignCode
          )}`;


        const res =
          await fetch(
            url
          );


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


        currentOrder =
          data;


        addonCart =
          {};


        // ==========================================
        // 已確認訂單：鎖定
        // ==========================================

        if(
          data.master.confirmStatus ===
          "已確認"
        ){

          orderArea.classList.add(
            "hidden"
          );


          const successArea =
            document.getElementById(
              "successArea"
            );


          if(successArea){

            successArea.classList.add(
              "hidden"
            );

          }


          renderTrackingStatus(
            data
          );


          status.textContent =
            "此訂單已完成確認，如需修改請聯絡 Gusta。";


          trackingArea.scrollIntoView({
            behavior:"smooth",
            block:"start"
          });


          return;

        }


        // ==========================================
        // 尚未確認
        // ==========================================

        trackingArea.classList.add(
          "hidden"
        );


        renderOrder(
          data
        );


        renderAllAddons();

        renderShipping();

        renderSummary();


        document
          .getElementById(
            "submitArea"
          )
          .classList.remove(
            "hidden"
          );


        const bankArea =
          document.getElementById(
            "bankArea"
          );


        if(bankArea){

          bankArea.classList.remove(
            "hidden"
          );

        }


        status.textContent =
          "";


        orderArea.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });

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


  const groupedItems =
    {};


  items.forEach(
    item=>{

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
        ] =
          [];

      }


      groupedItems[
        productName
      ].push(
        item
      );

    }
  );


  const itemBox =
    document.getElementById(
      "orderItems"
    );


  itemBox.innerHTML =
    "";


  Object
    .entries(
      groupedItems
    )
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


  orderArea.classList.remove(
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

    ${
      confirmDone
        ? `

          <div class="tracking-locked-notice">

            <strong>
              ✓ 此訂單已完成確認
            </strong>

            <p>
              訂單內容已鎖定，如需修改請直接聯絡 Gusta。
            </p>

          </div>

        `
        : ""
    }


    ${
      selectedCampaign
        ? `

          <div class="tracking-campaign-name">

            ${
              selectedCampaign.brand
                ? escapeHtml(
                    selectedCampaign.brand
                  ) + "｜"
                : ""
            }

            ${escapeHtml(
              selectedCampaign.campaignName ||
              ""
            )}

          </div>

        `
        : ""
    }


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
                  formatDateTime(
                    shippedAt
                  )
                )}
              </strong>

            </div>

          `
          : ""
      }

    </div>

  `;


  trackingArea.classList.remove(
    "hidden"
  );

}


// =====================================================
// Tracking step
// =====================================================

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
          ${escapeHtml(
            label
          )}
        </span>

        <strong>
          ${escapeHtml(
            text
          )}
        </strong>

      </div>

    </div>

  `;

}
// =====================================================
// Load addons for selected campaign
// =====================================================

async function getCampaignAddons(
  campaignCode
){

  if(!campaignCode){
    return [];
  }


  const url =
    `${API_BASE}?action=addons`
    +
    `&campaignCode=${encodeURIComponent(
      campaignCode
    )}`;


  const res =
    await fetch(
      url
    );


  if(!res.ok){

    throw new Error(
      "無法讀取加購商品"
    );

  }


  const data =
    await res.json();


  if(!data.success){

    throw new Error(
      data.message ||
      "加購商品讀取失敗"
    );

  }


  return Array.isArray(
    data.addons
  )
    ? data.addons
    : [];

}

// =====================================================
// Group addon products
// =====================================================

function groupAddonProducts(addons){

  const groups = {};


  addons.forEach(
    item=>{

      const name =
        String(
          item.name || ""
        ).trim();


      const spec =
        String(
          item.spec || ""
        ).trim();


      const perOrderLimit =
        Number(
          item.perOrderLimit
        ) || 0;


      // =================================================
      // Elastic Shaft
      // =================================================

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

            label =
              "加長";

          }
          else if(
            name.includes(
              "標準"
            )
          ){

            label =
              "標準";

          }
          else{

            label =
              name;

          }

        }


        groups.elastic.options.push({

          id:
            item.id,

          label:
            label,

          price:
            Number(
              item.price
            ) || 0,

          perOrderLimit:
            perOrderLimit

        });


        return;

      }


      // =================================================
      // Keyring
      // =================================================

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


        groups.keyring.colors.push({

          id:
            item.id,

          color:
            spec,

          price:
            Number(
              item.price
            ) || 0,

          perOrderLimit:
            perOrderLimit

        });


        return;

      }


      // =================================================
      // Clicker
      // =================================================

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

          mode =
            "高亢";

        }
        else if(
          name.includes(
            "低沉"
          )
        ){

          mode =
            "低沉";

        }


        if(
          !groups.clicker.modes[mode]
        ){

          groups.clicker.modes[mode] =
            [];

        }


        groups.clicker.modes[mode].push({

          id:
            item.id,

          color:
            spec,

          price:
            Number(
              item.price
            ) || 0,

          perOrderLimit:
            perOrderLimit

        });


        return;

      }


      // =================================================
      // 其他加購
      // =================================================

      if(
        !groups.other
      ){

        groups.other =
          [];

      }


      groups.other.push({

        id:
          item.id,

        title:
          name,

        label:
          spec || name,

        price:
          Number(
            item.price
          ) || 0,

        perOrderLimit:
          perOrderLimit

      });

    }
  );


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


  root.innerHTML =
    "";


  // =====================================================
  // Elastic
  // =====================================================

  if(
    groupedAddons.elastic
  ){

    root.appendChild(

      createAddonSelector(

        groupedAddons.elastic.title,

        groupedAddons.elastic.options.map(
          item=>({

            id:
              item.id,

            label:
              item.label,

            price:
              item.price,

            perOrderLimit:
              item.perOrderLimit

          })
        )

      )

    );

  }


  // =====================================================
  // Keyring
  // =====================================================

  if(
    groupedAddons.keyring
  ){

    root.appendChild(

      createAddonSelector(

        groupedAddons.keyring.title,

        groupedAddons.keyring.colors.map(
          item=>({

            id:
              item.id,

            label:
              item.color,

            price:
              item.price,

            perOrderLimit:
              item.perOrderLimit

          })
        )

      )

    );

  }


  // =====================================================
  // Clicker
  // =====================================================

  if(
    groupedAddons.clicker
  ){

    Object
      .entries(
        groupedAddons.clicker.modes
      )
      .forEach(
        ([mode,colors])=>{

          root.appendChild(

            createAddonSelector(

              `${groupedAddons.clicker.title}｜${mode}`,

              colors.map(
                item=>({

                  id:
                    item.id,

                  label:
                    item.color,

                  price:
                    item.price,

                  perOrderLimit:
                    item.perOrderLimit

                })
              )

            )

          );

        }
      );

  }


  // =====================================================
  // Other
  // =====================================================

  if(
    Array.isArray(
      groupedAddons.other
    )
  ){

    groupedAddons.other.forEach(
      item=>{

        root.appendChild(

          createAddonSelector(

            item.title,

            [
              {

                id:
                  item.id,

                label:
                  item.label,

                price:
                  item.price,

                perOrderLimit:
                  item.perOrderLimit

              }
            ]

          )

        );

      }
    );

  }


  const addonArea =
    document.getElementById(
      "addonArea"
    );


  if(
    root.children.length > 0
  ){

    addonArea.classList.remove(
      "hidden"
    );

  }
  else{

    addonArea.classList.add(
      "hidden"
    );

  }

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
      ${escapeHtml(
        title
      )}
    </div>

    <div class="addon-field-label">
      規格
    </div>


    <select>

      ${options
        .map(
          item=>`

            <option
              value="${escapeAttribute(
                item.id
              )}"
              data-price="${Number(
  item.price || 0
)}"
data-label="${escapeAttribute(
  item.label
)}"
data-limit="${Number(
  item.perOrderLimit || 0
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
        )
        .join("")
      }

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


  let qty =
    1;


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


       const itemId =
  selected.value;


const perOrderLimit =
  Number(
    selected.dataset.limit
  ) || 0;


const currentQty =
  addonCart[itemId]
    ? Number(
        addonCart[itemId].qty
      ) || 0
    : 0;


if(
  perOrderLimit > 0 &&
  currentQty + qty > perOrderLimit
){

  alert(
    `此商品每人最多加購 ${perOrderLimit} 個。`
  );

  return;

}


addAddonToCart({

  id:
    itemId,

  name:
    title,

  spec:
    selected.dataset.label,

  price:
    Number(
      selected.dataset.price
    ) || 0,

  qty,

  perOrderLimit

});


        qty =
          1;


        qtyValue.textContent =
          "1";

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
      Number(
        item.qty || 0
      );

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


    root.innerHTML =
      "";


    return;

  }


  area.classList.remove(
    "hidden"
  );


  root.innerHTML =
    "";


  items.forEach(
    item=>{

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

            × ${Number(
              item.qty
            )}

          </div>

        </div>


        <div class="cart-item-right">

          <strong>

            NT$${money(
              Number(
                item.price || 0
              )
              *
              Number(
                item.qty || 0
              )
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

    }
  );

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


  root.innerHTML =
    "";


  const shippingMethods =
    Array.isArray(
      initialData.shipping
    )
      ? initialData.shipping
      : [];


  shippingMethods.forEach(
    shipping=>{

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
            value="${escapeAttribute(
              shipping.name
            )}"
            data-price="${Number(
              shipping.price || 0
            )}"
          >

          <span>
            ${escapeHtml(
              shipping.name
            )}
          </span>

        </div>


        <strong>

          ${
            Number(
              shipping.price || 0
            ) > 0
              ? "NT$" +
                money(
                  shipping.price
                )
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
      input=>{

        input.addEventListener(
          "change",
          ()=>{

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


  if(!shipping){

    receiverArea.classList.add(
      "hidden"
    );


    return;

  }


  receiverArea.classList.remove(
    "hidden"
  );


  receiver711.classList.add(
    "hidden"
  );


  receiverMail.classList.add(
    "hidden"
  );


  if(
    shipping.name ===
    "7-11 店到店"
  ){

    receiver711.classList.remove(
      "hidden"
    );

  }


  else if(
    shipping.name ===
    "郵寄"
  ){

    receiverMail.classList.remove(
      "hidden"
    );

  }

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
      (
        sum,
        item
      )=>
        sum +
        (
          Number(
            item.price || 0
          )
          *
          Number(
            item.qty || 0
          )
        ),
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
      ? Number(
          shipping.price || 0
        )
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
      money(
        original
      );


  document
    .getElementById(
      "summaryAddon"
    )
    .textContent =
      "NT$" +
      money(
        addonTotal
      );


  document
    .getElementById(
      "summaryShipping"
    )
    .textContent =
      shipping
        ? (
            shippingFee > 0
              ? "NT$" +
                money(
                  shippingFee
                )
              : "免費"
          )
        : "尚未選擇";


  document
    .getElementById(
      "summaryTotal"
    )
    .textContent =
      "NT$" +
      money(
        total
      );


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
      message:
        "找不到目前訂單。"
    };

  }


  const shipping =
    getSelectedShipping();


  if(!shipping){

    return {
      valid:false,
      message:
        "請選擇運送方式。"
    };

  }


  const recipientName =
    document
      .getElementById(
        "recipientName"
      )
      .value
      .trim();


  const phone =
    document
      .getElementById(
        "recipientPhone"
      )
      .value
      .trim();


  if(!recipientName){

    return {
      valid:false,
      message:
        "請填寫收件人姓名。"
    };

  }


  if(!phone){

    return {
      valid:false,
      message:
        "請填寫手機號碼。"
    };

  }


  if(
    !/^09\d{8}$/.test(
      phone
    )
  ){

    return {
      valid:false,
      message:
        "請確認手機號碼是否正確。"
    };

  }


  if(
    shipping.name ===
    "7-11 店到店"
  ){

    const store =
      document
        .getElementById(
          "store711"
        )
        .value
        .trim();


    if(!store){

      return {
        valid:false,
        message:
          "請填寫 7-11 門市。"
      };

    }

  }


  if(
    shipping.name ===
    "郵寄"
  ){

    const address =
      document
        .getElementById(
          "mailAddress"
        )
        .value
        .trim();


    if(!address){

      return {
        valid:false,
        message:
          "請填寫郵寄地址。"
      };

    }

  }


  const confirmed =
    document
      .getElementById(
        "confirmCheck"
      )
      .checked;


  if(!confirmed){

    return {
      valid:false,
      message:
        "請勾選確認訂單內容。"
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

    action:
      "confirm",


    campaignCode:
      selectedCampaign
        ? selectedCampaign
            .campaignCode
        : "",


    orderId:
      currentOrder
        .master
        .orderId,


    addons:
      Object
        .values(
          addonCart
        )
        .map(
          item=>({

            id:
              item.id,

            qty:
              Number(
                item.qty || 0
              )

          })
        ),


    shippingMethod:
      shipping.name,


    recipientName:
      document
        .getElementById(
          "recipientName"
        )
        .value
        .trim(),


    phone:
      document
        .getElementById(
          "recipientPhone"
        )
        .value
        .trim(),


    postalCode:
      document
        .getElementById(
          "postalCode"
        )
        .value
        .trim(),


    address:
      document
        .getElementById(
          "mailAddress"
        )
        .value
        .trim(),


    store711:
      document
        .getElementById(
          "store711"
        )
        .value
        .trim(),


    paymentLast5:
      document
        .getElementById(
          "paymentLast5"
        )
        .value
        .trim(),


    note:
      document
        .getElementById(
          "orderNote"
        )
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


      button.disabled =
        true;


      button.textContent =
        "送出中...";


      submitStatus.textContent =
        "";


      try{

        const payload =
          buildOrderPayload();


        const res =
          await fetch(
            API_BASE,
            {

              method:
                "POST",

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

  document
    .getElementById(
      "searchCard"
    )
    .classList.add(
      "hidden"
    );


  orderArea.classList.add(
    "hidden"
  );


  trackingArea.classList.add(
    "hidden"
  );


  document
    .getElementById(
      "successOrderId"
    )
    .textContent =
      result.orderId;


  document
    .getElementById(
      "successTotal"
    )
    .textContent =
      "NT$" +
      money(
        result.payableTotal
      );


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


        await copyTextWithStatus(
          BANK_ACCOUNT,
          copyStatus
        );

      }
    );

}


const copyAccountButton =
  document.getElementById(
    "copyAccountButton"
  );


if(copyAccountButton){

  copyAccountButton
    .addEventListener(
      "click",
      async()=>{

        const copyStatus =
          document.getElementById(
            "copyStatus"
          );


        await copyTextWithStatus(
          BANK_ACCOUNT,
          copyStatus
        );

      }
    );

}


// =====================================================
// Copy helper
// =====================================================

async function copyTextWithStatus(
  text,
  statusElement
){

  try{

    await navigator
      .clipboard
      .writeText(
        text
      );


    if(statusElement){

      statusElement.textContent =
        "✓ 帳號已複製";


      setTimeout(
        ()=>{

          statusElement.textContent =
            "";

        },
        2500
      );

    }

  }
  catch(err){

    console.error(err);


    if(statusElement){

      statusElement.textContent =
        `請手動複製：${text}`;

    }

  }

}


// =====================================================
// Customer change
// =====================================================

select.addEventListener(
  "change",
  ()=>{

    hideCurrentOrder();

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


// =====================================================
// Escape HTML
// =====================================================

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


// =====================================================
// Escape attribute
// =====================================================

function escapeAttribute(text){

  return escapeHtml(
    text
  )
  .replace(
    /"/g,
    "&quot;"
  );

}


// =====================================================
// Campaign date helpers
// =====================================================

function formatCampaignRange(
  startDate,
  endDate
){

  const start =
    formatCampaignDate(
      startDate
    );


  const end =
    formatCampaignDate(
      endDate
    );


  if(
    start &&
    end
  ){

    return `${start}－${end}`;

  }


  return start ||
    end ||
    "";

}


function formatCampaignDate(
  value
){

  if(!value){

    return "";

  }


  // 如果是 yyyy-MM-dd
  const simpleMatch =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if(simpleMatch){

    return `${
      Number(simpleMatch[2])
    }/${
      Number(simpleMatch[3])
    }`;

  }


  // 如果 API 傳回完整日期字串
  const date =
    new Date(
      value
    );


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return "";

  }


  return `${
    date.getMonth() + 1
  }/${
    date.getDate()
  }`;

}


// =====================================================
// Date / time
// =====================================================

function formatDateTime(value){

  if(!value){

    return "";

  }


  const date =
    new Date(
      value
    );


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return String(
      value
    );

  }


  return date.toLocaleString(
    "zh-TW",
    {
      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,

      timeZone:
        "Asia/Taipei"
    }
  );

}


// =====================================================
// Start
// =====================================================

init();
