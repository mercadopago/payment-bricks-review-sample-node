const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const idType = document.getElementById('idType');
const idNumber = document.getElementById('idNumber');

const shippingStreetName = document.getElementById('shippingStreetName');
const shippingStreetNumber = document.getElementById('shippingStreetNumber');
const shippingNeighborhood = document.getElementById('shippingNeighborhood');
const shippingCity = document.getElementById('shippingCity');
const shippingFederalUnit = document.getElementById('shippingFederalUnit');
const shippingZipCode = document.getElementById('shippingZipCode');

const billingStreetName = document.getElementById('billingStreetName');
const billingStreetNumber = document.getElementById('billingStreetNumber');
const billingNeighborhood = document.getElementById('billingNeighborhood');
const billingCity = document.getElementById('billingCity');
const billingFederalUnit = document.getElementById('billingFederalUnit');
const billingZipCode = document.getElementById('billingZipCode');

const mercadoPagoPublicKey = document.getElementById("mercado-pago-public-key").value;
const mercadopago = new MercadoPago(mercadoPagoPublicKey);
let paymentBrickController;

const HARDCODED_DISCOUNT = 500;
const HARDCODED_SHIPPING_COST = 200;

let billingData = {
    firstName: "Ana",
    lastName: "Silva",
    taxIdentificationNumber: "9999",
    identification: { 
        type: "CURP",
        number: "123456789",
    },
    billingAddress: {
        streetName: "Avenida Paulista",
        streetNumber: "1234",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        federalUnit: "SP",
        zipCode: "01310200",
    },
};

let shippingData = {
    costs: HARDCODED_SHIPPING_COST,
    shippingMode: "Express",
    description: "Super Fast",
    receiverAddress: {
        streetName: "Avenida Paulista",
        streetNumber: "1234",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        federalUnit: "SP",
        zipCode: "01310200",
    },
}

async function loadPaymentForm() {
    const unitPrice = document.getElementById('unit-price').innerText;
    const quantity = document.getElementById('quantity').value;
    const productName = document.getElementById('product-name').innerText;

    // This preference is being created without Shipping and Discounts amounts
    // If you need this in your product, make sure to send them to your backend 
    const preferenceId = await getPreferenceId(unitPrice, quantity);

    const settings = {
        initialization: {
            amount: (quantity * unitPrice) + HARDCODED_SHIPPING_COST - HARDCODED_DISCOUNT,
            preferenceId,
            items: {
                totalItemsAmount: quantity * unitPrice,
                itemsList: [
                    {
                        units: quantity,
                        value: unitPrice,
                        name: productName,
                        imageURL: "img/product.png",
                    },
                ],
            },
            shipping: shippingData,
            billing: billingData,
            discounts: {
                totalDiscountsAmount: HARDCODED_DISCOUNT,
                discountsList: [
                    {
                        name: "WELCOME_100",
                        value: HARDCODED_DISCOUNT,
                    },
                ],
            },
        },
        callbacks: {
            onReady: () => {
                document.getElementById('loader-container').style.display = 'none'
                console.log('brick ready')
            },
            onError: (error) => {
                alert(JSON.stringify(error))
            },
            onSubmit: ({ selectedPaymentMethod, formData }) => {
                return proccessPayment({ selectedPaymentMethod, formData })
            },
            onClickEditShippingData: () => {
                /* Notice that the edit process happens in the same page,
                because we need to keep the same bricks instance */
                goToEditShipping();
            },
            onClickEditBillingData: () => {
                /* Notice that the edit process happens in the same page,
                because we need to keep the same bricks instance */
                goToEditBilling();
            },
            onRenderNextStep: (currentStep) => {
                console.log('onRenderNextStep', currentStep)
            },
            onRenderPreviousStep: (currentStep) => {
                console.log('onRenderPreviousStep', currentStep)
            },
        },
        locale: 'en',
        customization: {
            enableReviewStep: true,
            paymentMethods: {
                creditCard: 'all',
                debitCard: 'all',
                /* If some of the following payment methods is not valid for your country,
                the Brick will show a warning message in the browser console */
                ticket: 'all',
                atm: 'all',
                bankTransfer: 'all',
                mercadoPago: 'all',
            },
            visual: {
                style: {
                    theme: 'dark',
                    customVariables: {
                        formBackgroundColor: '#1d2431',
                        baseColor: 'aquamarine'
                    }
                }
            }
        },
    }

    const bricks = mercadopago.bricks();
    paymentBrickController = await bricks.create('payment', 'mercadopago-bricks-contaner__Payment', settings);
};

const getPreferenceId = async (unitPrice, quantity) => {
    const response = await fetch(`/preference_id?unitPrice=${unitPrice}&quantity=${quantity}`);
    const { preferenceId } = await response.json();
    return preferenceId;
};

const proccessPayment = ({ selectedPaymentMethod, formData }) => {
    return new Promise((resolve, reject) => {
        if (selectedPaymentMethod === 'wallet_purchase' || selectedPaymentMethod === 'onboarding_credits') {
            // wallet_purchase and onboarding_credits does not need to be sent to backend
            fadeTransition('.container__payment', '.container__result'),
            resolve();
        } else {
            /*
                Here you can add properties to formData if you want to.

                - For Peru, 'description' is mandatory for 'pagoefectivo_atm' payment method.
                
                - For Colombia, 'description', 'ip_address' and 'callback_url' are mandatory for 'pse' payment method,
                  but the two last mentioned fields, we recommend adding in the backend.
            */
            formData.description = document.getElementById('product-name').innerText

            fetch('process_payment', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ selectedPaymentMethod, formData })
            })
                .then(response => response.json())
                .then((json) => {
                    const { error_message } = json;
                    if(error_message) {
                        alert(`Error: ${JSON.stringify(error_message)}`)
                        reject();
                    } else {
                        resolve();
                        window.location = `/payment_status?payment_id=${json.id}`
                    }
                })
                .catch((error) => {
                    console.error(error)
                    reject();
                })
        }
    });
}

function goToEditShipping() {
    shippingStreetName.value = shippingData.receiverAddress.streetName;
    shippingStreetNumber.value = shippingData.receiverAddress.streetNumber;
    shippingNeighborhood.value = shippingData.receiverAddress.neighborhood;
    shippingCity.value = shippingData.receiverAddress.city;
    shippingFederalUnit.value = shippingData.receiverAddress.federalUnit;
    shippingZipCode.value = shippingData.receiverAddress.zipCode;
    
    fadeTransition('.container__payment', '.container__shipping');
}

function goToEditBilling() {
    firstName.value = billingData.firstName;
    lastName.value = billingData.lastName;
    idType.value = billingData.identification.type;
    idNumber.value = billingData.identification.number;
    billingStreetName.value = billingData.billingAddress.streetName;
    billingStreetNumber.value = billingData.billingAddress.streetNumber;
    billingNeighborhood.value = billingData.billingAddress.neighborhood;
    billingCity.value = billingData.billingAddress.city;
    billingFederalUnit.value = billingData.billingAddress.federalUnit;
    billingZipCode.value = billingData.billingAddress.zipCode;

    fadeTransition('.container__payment', '.container__billing');
}

function getShippingFormData() {
    shippingData = {
        costs: HARDCODED_SHIPPING_COST,
        shippingMode: "Express",
        description: "Super Fast",
        receiverAddress: {
            streetName: shippingStreetName.value,
            streetNumber: shippingStreetNumber.value,
            neighborhood: shippingNeighborhood.value,
            city: shippingCity.value,
            federalUnit: shippingFederalUnit.value,
            zipCode: shippingZipCode.value,
        },
    };

    return { shipping: shippingData };
}

function getBillingFormData() {
    billingData = {
        firstName: firstName.value,
        lastName: lastName.value,
        taxIdentificationNumber: "9999",
        identification: { 
            type: idType.value,
            number: idNumber.value,
        },
        billingAddress: {
            streetName: billingStreetName.value,
            streetNumber: billingStreetNumber.value,
            neighborhood: billingNeighborhood.value,
            city: billingCity.value,
            federalUnit: billingFederalUnit.value,
            zipCode: billingZipCode.value,
        },
    };

    return { billing: billingData };
}

function fadeTransition(currentElement, futureElement) {
    $(currentElement).fadeOut(500);
    setTimeout(() => {
        $(futureElement).show(500).fadeIn();
    }, 500);
}

// Handle transitions
document.getElementById('checkout-btn').addEventListener('click', function () {
    $('.container__cart').fadeOut(500);
    setTimeout(() => {
        loadPaymentForm();
        $('.container__payment').show(500).fadeIn();
    }, 500);
});

document.getElementById('go-back')
    .addEventListener('click', () => fadeTransition('.container__payment', '.container__cart'));

// Handle update billing/shipping
document.getElementById('shipping-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const updatedShippingData = getShippingFormData();
    const updateResult = paymentBrickController.update(updatedShippingData);

    if (updateResult) {
        fadeTransition('.container__shipping', '.container__payment')
    } else {
        alert('Update shipping data failed')
    }
});

document.getElementById('billing-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const updatedBillingData = getBillingFormData();
    const updateResult = paymentBrickController.update(updatedBillingData);

    if (updateResult) {
        fadeTransition('.container__billing', '.container__payment')
    } else {
        alert('Update billing data failed')
    }
});

// Handle price update
function updatePrice() {
    let quantity = document.getElementById('quantity').value;
    let unitPrice = document.getElementById('unit-price').innerText;
    let amount = parseInt(unitPrice) * parseInt(quantity);

    document.getElementById('cart-total').innerText = '$ ' + amount;
    document.getElementById('summary-price').innerText = '$ ' + unitPrice;
    document.getElementById('summary-quantity').innerText = quantity;
    document.getElementById('summary-total').innerText = '$ ' + amount;
    document.getElementById('amount').value = amount;
};

document.getElementById('quantity').addEventListener('change', updatePrice);
updatePrice();